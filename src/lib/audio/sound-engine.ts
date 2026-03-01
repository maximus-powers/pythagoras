import { Howl, Howler } from "howler";

export type SoundType = "beep" | "whistle" | "growl";

export interface SoundConfig {
  soundType: SoundType;
  silenceDurationMs: number;
  gapDurationMs: number;
}

export const DEFAULT_CONFIG: SoundConfig = {
  soundType: "beep",
  silenceDurationMs: 150,
  gapDurationMs: 100,
};

interface SoundSet {
  short: Howl;
  long: Howl;
}

export class SoundEngine {
  private config: SoundConfig;
  private sounds: Record<SoundType, SoundSet> | null = null;
  private isPlaying = false;
  private abortController: AbortController | null = null;
  private loadPromise: Promise<void> | null = null;

  constructor(config: SoundConfig = DEFAULT_CONFIG) {
    this.config = config;
  }

  /**
   * Load all sound files - call this early to preload
   */
  async loadSounds(): Promise<void> {
    if (this.sounds) return;
    if (this.loadPromise) return this.loadPromise;

    this.loadPromise = new Promise((resolve, reject) => {
      const soundTypes: SoundType[] = ["beep", "whistle", "growl"];
      const sounds: Partial<Record<SoundType, SoundSet>> = {};
      let loadedCount = 0;
      const totalSounds = soundTypes.length * 2;

      const onLoad = () => {
        loadedCount++;
        if (loadedCount === totalSounds) {
          this.sounds = sounds as Record<SoundType, SoundSet>;
          console.log("All sounds loaded successfully");
          resolve();
        }
      };

      const onError = (type: string, variant: string) => () => {
        console.error(`Failed to load ${type}-${variant}`);
        reject(new Error(`Failed to load ${type}-${variant}`));
      };

      for (const type of soundTypes) {
        sounds[type] = {
          short: new Howl({
            src: [`/sounds/${type}-short.mp3`],
            html5: true, // More reliable on iOS
            preload: true,
            onload: onLoad,
            onloaderror: onError(type, "short"),
          }),
          long: new Howl({
            src: [`/sounds/${type}-long.mp3`],
            html5: true,
            preload: true,
            onload: onLoad,
            onloaderror: onError(type, "long"),
          }),
        };
      }
    });

    return this.loadPromise;
  }

  /**
   * Check if sounds are loaded and ready
   */
  isReady(): boolean {
    return this.sounds !== null;
  }

  /**
   * Get debug info
   */
  getDebugInfo(): { loaded: boolean; ctx: string; muted: boolean } {
    return {
      loaded: this.sounds !== null,
      ctx: Howler.ctx ? Howler.ctx.state : "no-context",
      muted: Howler.volume() === 0,
    };
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

    // Stop all currently playing sounds
    if (this.sounds) {
      for (const type of Object.values(this.sounds)) {
        type.short.stop();
        type.long.stop();
      }
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
    // Ensure sounds are loaded
    await this.loadSounds();

    if (!this.sounds) {
      console.error("Sounds not loaded");
      return;
    }

    if (this.isPlaying) {
      this.stop();
    }

    this.isPlaying = true;
    this.abortController = new AbortController();
    const { signal } = this.abortController;

    const tokens = this.parseSequence(sequence);
    const soundSet = this.sounds[this.config.soundType];

    try {
      for (let i = 0; i < tokens.length; i++) {
        if (signal.aborted) break;

        const token = tokens[i];

        if (token === "0") {
          // Silence
          await this.delay(this.config.silenceDurationMs, signal);
        } else {
          // Play short or long sound
          const sound = token === "." ? soundSet.short : soundSet.long;
          const duration = token === "." ? 100 : 300; // Match the file durations
          
          sound.play();
          await this.delay(duration, signal);
        }

        // Add gap between elements (except after the last one)
        if (i < tokens.length - 1 && !signal.aborted) {
          await this.delay(this.config.gapDurationMs, signal);
        }
      }
    } finally {
      this.isPlaying = false;
      this.abortController = null;
    }
  }

  /**
   * Play a simple test sound
   */
  async testSound(): Promise<string> {
    try {
      await this.loadSounds();
      if (!this.sounds) {
        return "ERR: Sounds not loaded";
      }

      const soundSet = this.sounds[this.config.soundType];
      soundSet.short.play();

      const ctx = Howler.ctx;
      return `OK: played ${this.config.soundType}-short, ctx=${ctx?.state ?? "none"}`;
    } catch (e) {
      return `ERR: ${e}`;
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
        signal.addEventListener(
          "abort",
          () => {
            clearTimeout(timeout);
            resolve();
          },
          { once: true }
        );
      }
    });
  }

  /**
   * Cleanup resources
   */
  dispose() {
    this.stop();
    if (this.sounds) {
      for (const type of Object.values(this.sounds)) {
        type.short.unload();
        type.long.unload();
      }
      this.sounds = null;
    }
    this.loadPromise = null;
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
