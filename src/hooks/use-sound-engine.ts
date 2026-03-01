"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { getSoundEngine, SoundConfig } from "@/lib/audio/sound-engine";
import { useAppStore } from "@/lib/store";

export function useSoundEngine() {
  const engineRef = useRef(getSoundEngine());
  const { soundConfig, isMuted, setSoundConfig, setMuted } = useAppStore();
  const [isAudioReady, setIsAudioReady] = useState(false);

  // Sync engine config with store
  useEffect(() => {
    engineRef.current.setConfig(soundConfig);
  }, [soundConfig]);

  const playSequence = useCallback(async (sequence: string) => {
    if (isMuted) return;
    
    try {
      // Try to unlock audio on every play attempt (required for iOS)
      const engine = engineRef.current;
      await engine.unlock();
      await engine.playSequence(sequence);
      
      // Update ready state after successful play
      if (!isAudioReady && engine.isReady()) {
        setIsAudioReady(true);
      }
    } catch (err) {
      console.error("Failed to play sequence:", err);
    }
  }, [isMuted, isAudioReady]);

  const stop = useCallback(() => {
    engineRef.current.stop();
  }, []);

  const setConfig = useCallback((newConfig: Partial<SoundConfig>) => {
    setSoundConfig(newConfig);
  }, [setSoundConfig]);

  const toggleMute = useCallback(() => {
    setMuted(!isMuted);
  }, [isMuted, setMuted]);

  return {
    playSequence,
    stop,
    isMuted,
    toggleMute,
    config: soundConfig,
    setConfig,
    isAudioReady,
  };
}
