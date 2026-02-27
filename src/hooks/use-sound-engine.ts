"use client";

import { useCallback, useEffect, useRef } from "react";
import { getSoundEngine, SoundConfig } from "@/lib/audio/sound-engine";
import { useAppStore } from "@/lib/store";

export function useSoundEngine() {
  const engineRef = useRef(getSoundEngine());
  const { soundConfig, isMuted, setSoundConfig, setMuted } = useAppStore();

  // Sync engine config with store
  useEffect(() => {
    engineRef.current.setConfig(soundConfig);
  }, [soundConfig]);

  const playSequence = useCallback(async (sequence: string) => {
    if (isMuted) return;
    
    await engineRef.current.playSequence(sequence);
  }, [isMuted]);

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
  };
}
