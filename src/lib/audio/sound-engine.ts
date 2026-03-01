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
   * Create AudioContext synchronously - MUST be called from direct user gesture for PWA
   */
  ensureContextSync(): AudioContext {
    if (!this.audioContext) {
      const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.audioContext = new AudioContextClass();
    }
    return this.audioContext;
  }

  /**
   * Just create the context and resume it - no unlock tone
   */
  unlockSync(): void {
    try {
      const ctx = this.ensureContextSync();
      if (ctx.state === "suspended") {
        ctx.resume();
      }
      this.unlocked = true;
    } catch (e) {
      console.warn("Sync unlock failed:", e);
    }
  }

  /**
   * Get or create AudioContext, resuming if suspended
   */
  private async getContext(): Promise<AudioContext> {
    const ctx = this.ensureContextSync();
    
    if (ctx.state === "suspended") {
      try {
        await ctx.resume();
      } catch (e) {
        console.warn("Failed to resume audio context:", e);
      }
    }
    
    this.unlocked = true;
    return ctx;
  }

  /**
   * Unlock audio on iOS - async version
   */
  async unlock(): Promise<boolean> {
    this.unlockSync();
    return this.unlocked;
  }

  isReady(): boolean {
    return this.unlocked;
  }

  /**
   * Get debug info about audio state
   */
  getDebugInfo(): { state: string; sampleRate: number; unlocked: boolean } {
    return {
      state: this.audioContext?.state ?? "no-context",
      sampleRate: this.audioContext?.sampleRate ?? 0,
      unlocked: this.unlocked,
    };
  }

  /**
   * Play a simple test beep - for debugging (Web Audio API)
   */
  async testBeep(): Promise<string> {
    try {
      const ctx = await this.getContext();
      
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.type = "sine";
      osc.frequency.value = 880; // A5 - easy to hear
      gain.gain.value = 1.0; // Max volume
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      const startTime = ctx.currentTime;
      osc.start(startTime);
      osc.stop(startTime + 0.5); // Half second beep
      
      return `OK: ctx=${ctx.state}, dest=${ctx.destination.channelCount}ch, time=${startTime.toFixed(2)}`;
    } catch (e) {
      return `ERR: ${e}`;
    }
  }

  /**
   * Test using HTML5 Audio element - alternative approach for iOS
   */
  async testHtmlAudio(): Promise<string> {
    try {
      // Base64 encoded WAV file: 440Hz sine wave, 0.5 seconds
      const wavBase64 = "UklGRl4lAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YTolAAA" + 
        this.generateSineWaveBase64(440, 0.5);
      
      const audio = new Audio(`data:audio/wav;base64,${wavBase64}`);
      audio.volume = 1.0;
      
      return new Promise((resolve) => {
        audio.onended = () => resolve("HTML Audio: played successfully");
        audio.onerror = (e) => resolve(`HTML Audio error: ${e}`);
        audio.play()
          .then(() => resolve("HTML Audio: play() succeeded"))
          .catch((e) => resolve(`HTML Audio play() failed: ${e}`));
      });
    } catch (e) {
      return `HTML Audio ERR: ${e}`;
    }
  }

  /**
   * Generate base64 encoded PCM data for a sine wave
   */
  private generateSineWaveBase64(freq: number, durationSec: number): string {
    const sampleRate = 44100;
    const numSamples = Math.floor(sampleRate * durationSec);
    const buffer = new Int16Array(numSamples);
    
    for (let i = 0; i < numSamples; i++) {
      const t = i / sampleRate;
      buffer[i] = Math.floor(Math.sin(2 * Math.PI * freq * t) * 32767 * 0.8);
    }
    
    // Convert to base64
    const bytes = new Uint8Array(buffer.buffer);
    let binary = '';
    for (let i = 0; i < bytes.length; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
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
          
          // Simple loud beep - no fancy envelope (iOS compatibility)
          gainNode.gain.value = 1.0;
          
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
