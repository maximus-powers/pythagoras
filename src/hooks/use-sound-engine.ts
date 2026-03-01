"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { getSoundEngine, SoundConfig } from "@/lib/audio/sound-engine";
import { useAppStore } from "@/lib/store";

export function useSoundEngine() {
  const engineRef = useRef(getSoundEngine());
  const { soundConfig, isMuted, setSoundConfig, setMuted } = useAppStore();
  const [isAudioReady, setIsAudioReady] = useState(false);

  // Preload sounds on mount
  useEffect(() => {
    engineRef.current.loadSounds().then(() => {
      setIsAudioReady(true);
    }).catch((err) => {
      console.error("Failed to load sounds:", err);
    });
  }, []);

  // Sync engine config with store
  useEffect(() => {
    engineRef.current.setConfig(soundConfig);
  }, [soundConfig]);

  const playSequence = useCallback(async (sequence: string) => {
    if (isMuted) return;
    
    try {
      await engineRef.current.playSequence(sequence);
    } catch (err) {
      console.error("Failed to play sequence:", err);
    }
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

  const getDebugInfo = useCallback(() => {
    return engineRef.current.getDebugInfo();
  }, []);

  const testSound = useCallback(async () => {
    return engineRef.current.testSound();
  }, []);

  return {
    playSequence,
    stop,
    isMuted,
    toggleMute,
    config: soundConfig,
    setConfig,
    isAudioReady,
    getDebugInfo,
    testSound,
  };
}
