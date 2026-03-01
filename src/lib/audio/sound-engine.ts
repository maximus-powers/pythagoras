export type SoundType = "beep" | "whistle" | "growl" | "tss";

export interface SoundConfig {
  soundType: SoundType;
  frequency: number;
  shortDurationMs: number;
  longDurationMs: number;
  silenceDurationMs: number;
  gapDurationMs: number;
}

export const DEFAULT_CONFIG: SoundConfig = {
  soundType: "beep",
  frequency: 800,
  shortDurationMs: 100,
  longDurationMs: 300,
  silenceDurationMs: 150,
  gapDurationMs: 120,
};

// Gap multiplier by sound type (whistle needs longer gaps due to vibrato)
const GAP_MULTIPLIER: Record<SoundType, number> = {
  beep: 1,
  whistle: 1.7,
  growl: 1,
  tss: 1,
};

export class SoundEngine {
  private config: SoundConfig;
  private isPlaying = false;
  private abortController: AbortController | null = null;
  private audioContext: AudioContext | null = null;
  private unlocked = false;

  constructor(config: SoundConfig = DEFAULT_CONFIG) {
    this.config = config;
  }

  /**
   * Get or create AudioContext, resuming if suspended
   */
  private async getContext(): Promise<AudioContext> {
    if (!this.audioContext) {
      // Use webkitAudioContext for older iOS Safari
      const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.audioContext = new AudioContextClass();
    }
    
    // Always try to resume (required on iOS after suspend)
    if (this.audioContext.state === "suspended") {
      try {
        await this.audioContext.resume();
      } catch (e) {
        console.warn("Failed to resume audio context:", e);
      }
    }
    
    return this.audioContext;
  }

  /**
   * Unlock audio on iOS - call from user gesture
   */
  async unlock(): Promise<boolean> {
    if (this.unlocked) return true;
    
    try {
      const ctx = await this.getContext();
      
      // Play a silent buffer to unlock
      const buffer = ctx.createBuffer(1, 1, 22050);
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.connect(ctx.destination);
      source.start(0);
      
      this.unlocked = true;
      console.log("Audio unlocked, context state:", ctx.state);
      return true;
    } catch (e) {
      console.warn("Audio unlock failed:", e);
      return false;
    }
  }

  isReady(): boolean {
    return this.unlocked;
  }

  setConfig(config: Partial<SoundConfig>) {
    this.config = { ...this.config, ...config };
  }

  getConfig(): SoundConfig {
    return { ...this.config };
  }

  stop() {
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }
    this.isPlaying = false;
  }

  /**
   * Parse a sequence string into tokens
   * "." = short, "_" = long, "0" = silence
   */
  parseSequence(sequence: string): Array<"." | "_" | "0"> {
    const tokens: Array<"." | "_" | "0"> = [];
    for (const char of sequence) {
      if (char === "." || char === "_" || char === "0") {
        tokens.push(char);
      }
    }
    return tokens;
  }

  /**
   * Play a complete sequence
   */
  async playSequence(sequence: string): Promise<void> {
    if (this.isPlaying) {
      this.stop();
    }

    this.isPlaying = true;
    this.abortController = new AbortController();
    const { signal } = this.abortController;

    const tokens = this.parseSequence(sequence);

    try {
      for (let i = 0; i < tokens.length; i++) {
        if (signal.aborted) break;

        const token = tokens[i];
        
        if (token === "0") {
          await this.delay(this.config.silenceDurationMs, signal);
        } else {
          const duration = token === "." ? this.config.shortDurationMs : this.config.longDurationMs;
          await this.playSound(duration, signal);
        }

        // Add gap between elements (except after the last one)
        if (i < tokens.length - 1 && !signal.aborted) {
          const gap = this.config.gapDurationMs * GAP_MULTIPLIER[this.config.soundType];
          await this.delay(gap, signal);
        }
      }
    } finally {
      this.isPlaying = false;
      this.abortController = null;
    }
  }

  /**
   * Play a single sound element based on current sound type
   */
  private async playSound(durationMs: number, signal?: AbortSignal): Promise<void> {
    if (signal?.aborted) return;

    try {
      const ctx = await this.getContext();
      const durationSec = durationMs / 1000;
      const frequency = this.config.frequency;
      const now = ctx.currentTime;

      const gainNode = ctx.createGain();
      gainNode.connect(ctx.destination);

      switch (this.config.soundType) {
        case "beep": {
          const osc = ctx.createOscillator();
          osc.type = "sine";
          osc.frequency.value = frequency;
          osc.connect(gainNode);
          
          // Quick attack, sustain, quick release
          gainNode.gain.setValueAtTime(0, now);
          gainNode.gain.linearRampToValueAtTime(0.5, now + 0.005);
          gainNode.gain.setValueAtTime(0.5, now + durationSec - 0.01);
          gainNode.gain.linearRampToValueAtTime(0, now + durationSec);
          
          osc.start(now);
          osc.stop(now + durationSec);
          break;
        }
        
        case "whistle": {
          const osc = ctx.createOscillator();
          osc.type = "sine";
          osc.frequency.value = frequency * 2.5;
          
          // Add vibrato with LFO
          const lfo = ctx.createOscillator();
          const lfoGain = ctx.createGain();
          lfo.frequency.value = 5;
          lfoGain.gain.value = 30;
          lfo.connect(lfoGain);
          lfoGain.connect(osc.frequency);
          
          osc.connect(gainNode);
          
          gainNode.gain.setValueAtTime(0, now);
          gainNode.gain.linearRampToValueAtTime(0.4, now + 0.05);
          gainNode.gain.setValueAtTime(0.4, now + durationSec - 0.05);
          gainNode.gain.linearRampToValueAtTime(0, now + durationSec);
          
          lfo.start(now);
          osc.start(now);
          osc.stop(now + durationSec);
          lfo.stop(now + durationSec);
          break;
        }
        
        case "growl": {
          const osc = ctx.createOscillator();
          osc.type = "sawtooth";
          osc.frequency.value = frequency / 4;
          
          const filter = ctx.createBiquadFilter();
          filter.type = "lowpass";
          filter.frequency.value = 400;
          filter.Q.value = 5;
          
          osc.connect(filter);
          filter.connect(gainNode);
          
          gainNode.gain.setValueAtTime(0, now);
          gainNode.gain.linearRampToValueAtTime(0.6, now + 0.05);
          gainNode.gain.setValueAtTime(0.6, now + durationSec - 0.1);
          gainNode.gain.linearRampToValueAtTime(0, now + durationSec);
          
          osc.start(now);
          osc.stop(now + durationSec);
          break;
        }
        
        case "tss": {
          // Create white noise for tss sound
          const bufferSize = ctx.sampleRate * durationSec;
          const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
          const data = buffer.getChannelData(0);
          for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
          }
          
          const noise = ctx.createBufferSource();
          noise.buffer = buffer;
          
          const filter = ctx.createBiquadFilter();
          filter.type = "highpass";
          filter.frequency.value = 4000;
          
          noise.connect(filter);
          filter.connect(gainNode);
          
          gainNode.gain.setValueAtTime(0, now);
          gainNode.gain.linearRampToValueAtTime(0.3, now + 0.01);
          gainNode.gain.setValueAtTime(0.3, now + durationSec - 0.05);
          gainNode.gain.linearRampToValueAtTime(0, now + durationSec);
          
          noise.start(now);
          break;
        }
      }

      // Wait for the sound to complete
      await this.delay(durationMs, signal);
    } catch (e) {
      console.error("Error playing sound:", e);
    }
  }

  /**
   * Delay helper with abort support
   */
  private delay(ms: number, signal?: AbortSignal): Promise<void> {
    return new Promise((resolve) => {
      if (signal?.aborted) {
        resolve();
        return;
      }

      const timeout = setTimeout(resolve, ms);

      if (signal) {
        signal.addEventListener("abort", () => {
          clearTimeout(timeout);
          resolve();
        }, { once: true });
      }
    });
  }

  /**
   * Cleanup resources
   */
  async dispose() {
    this.stop();
    if (this.audioContext) {
      await this.audioContext.close();
      this.audioContext = null;
    }
    this.unlocked = false;
  }
}

// Singleton instance for the app
let soundEngineInstance: SoundEngine | null = null;

export function getSoundEngine(): SoundEngine {
  if (!soundEngineInstance) {
    soundEngineInstance = new SoundEngine();
  }
  return soundEngineInstance;
}
