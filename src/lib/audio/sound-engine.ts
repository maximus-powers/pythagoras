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

// Tone.js types (loaded dynamically)
type ToneType = typeof import("tone");
type Synth = InstanceType<ToneType["Synth"]>;
type MonoSynth = InstanceType<ToneType["MonoSynth"]>;
type NoiseSynth = InstanceType<ToneType["NoiseSynth"]>;
type Filter = InstanceType<ToneType["Filter"]>;
type Vibrato = InstanceType<ToneType["Vibrato"]>;

export class SoundEngine {
  private config: SoundConfig;
  private isPlaying = false;
  private abortController: AbortController | null = null;
  
  // Tone.js module and instruments (loaded dynamically)
  private Tone: ToneType | null = null;
  private beepSynth: Synth | null = null;
  private whistleSynth: Synth | null = null;
  private whistleVibrato: Vibrato | null = null;
  private growlSynth: MonoSynth | null = null;
  private noiseSynth: NoiseSynth | null = null;
  private noiseFilter: Filter | null = null;
  private initialized = false;

  constructor(config: SoundConfig = DEFAULT_CONFIG) {
    this.config = config;
  }

  /**
   * Initialize Tone.js instruments (must be called after user interaction)
   */
  private async ensureInitialized(): Promise<void> {
    if (this.initialized && this.Tone) {
      await this.Tone.start();
      return;
    }

    // Dynamically import Tone.js (client-side only)
    const Tone = await import("tone");
    this.Tone = Tone;
    
    await Tone.start();
    console.log("Tone.js initialized, audio context state:", Tone.getContext().state);
    
    // Clean sine wave beep - classic clicker sound
    this.beepSynth = new Tone.Synth({
      oscillator: { type: "sine" },
      envelope: {
        attack: 0.005,
        decay: 0.1,
        sustain: 0.3,
        release: 0.1,
      },
      volume: -6,
    }).toDestination();

    // Whistle - higher pitched with vibrato for realistic whistle
    this.whistleVibrato = new Tone.Vibrato(5, 0.3).toDestination();
    this.whistleSynth = new Tone.Synth({
      oscillator: { type: "sine" },
      envelope: {
        attack: 0.05,
        decay: 0.1,
        sustain: 0.8,
        release: 0.2,
      },
      volume: -6,
    }).connect(this.whistleVibrato);

    // Growl - deep, aggressive sawtooth with filter sweep
    this.growlSynth = new Tone.MonoSynth({
      oscillator: { type: "sawtooth" },
      envelope: {
        attack: 0.05,
        decay: 0.2,
        sustain: 0.6,
        release: 0.3,
      },
      filterEnvelope: {
        attack: 0.05,
        decay: 0.3,
        sustain: 0.4,
        release: 0.3,
        baseFrequency: 80,
        octaves: 3,
      },
      volume: -3,
    }).toDestination();

    // Tss - white noise burst, like a cat hiss
    this.noiseFilter = new Tone.Filter(4000, "highpass").toDestination();
    this.noiseSynth = new Tone.NoiseSynth({
      noise: { type: "white" },
      envelope: {
        attack: 0.01,
        decay: 0.05,
        sustain: 0.3,
        release: 0.1,
      },
      volume: -10,
    }).connect(this.noiseFilter);

    this.initialized = true;
    console.log("Sound engine initialized with Tone.js synthesizers");
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
    
    // Stop all synths
    try {
      this.beepSynth?.triggerRelease();
      this.whistleSynth?.triggerRelease();
      this.growlSynth?.triggerRelease();
      this.noiseSynth?.triggerRelease();
    } catch {
      // Ignore errors during cleanup
    }
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

    await this.ensureInitialized();

    this.isPlaying = true;
    this.abortController = new AbortController();
    const { signal } = this.abortController;

    const tokens = this.parseSequence(sequence);
    console.log("Playing sequence:", sequence, "tokens:", tokens, "soundType:", this.config.soundType);

    try {
      for (let i = 0; i < tokens.length; i++) {
        if (signal.aborted) break;

        const token = tokens[i];
        
        if (token === "0") {
          await this.playSilence(signal);
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

    const durationSec = durationMs / 1000;
    const frequency = this.config.frequency;

    console.log("Playing sound:", this.config.soundType, "freq:", frequency, "duration:", durationMs);

    switch (this.config.soundType) {
      case "beep":
        this.beepSynth?.triggerAttackRelease(frequency, durationSec);
        break;
      
      case "whistle":
        // Whistle is higher pitched with triangle wave
        this.whistleSynth?.triggerAttackRelease(frequency * 2.5, durationSec);
        break;
      
      case "growl":
        // Growl is lower pitched
        this.growlSynth?.triggerAttackRelease(frequency / 4, durationSec);
        break;
      
      case "tss":
        this.noiseSynth?.triggerAttackRelease(durationSec);
        break;
    }

    // Wait for the sound to complete
    await this.delay(durationMs, signal);
  }

  /**
   * Wait for silence duration
   */
  private async playSilence(signal?: AbortSignal): Promise<void> {
    return this.delay(this.config.silenceDurationMs, signal);
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
    this.beepSynth?.dispose();
    this.whistleSynth?.dispose();
    this.whistleVibrato?.dispose();
    this.growlSynth?.dispose();
    this.noiseSynth?.dispose();
    this.noiseFilter?.dispose();
    this.beepSynth = null;
    this.whistleSynth = null;
    this.whistleVibrato = null;
    this.growlSynth = null;
    this.noiseSynth = null;
    this.noiseFilter = null;
    this.initialized = false;
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
