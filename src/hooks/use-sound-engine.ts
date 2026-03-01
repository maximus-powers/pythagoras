"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { getSoundEngine, SoundConfig } from "@/lib/audio/sound-engine";
import { useAppStore } from "@/lib/store";

export function useSoundEngine() {
  const engineRef = useRef(getSoundEngine());
  const { soundConfig, isMuted, setSoundConfig, setMuted } = useAppStore();
  const [isAudioReady, setIsAudioReady] = useState(false);

  // Attach unlock listeners on mount (for iOS/Safari)
  useEffect(() => {
    const engine = engineRef.current;
    engine.attachUnlockListeners();
    
    // Check periodically if audio is ready
    const checkReady = () => {
      if (engine.isReady()) {
        setIsAudioReady(true);
      }
    };
    
    // Check immediately and after common unlock events
    checkReady();
    const interval = setInterval(checkReady, 500);
    
    return () => clearInterval(interval);
  }, []);

  // Sync engine config with store
  useEffect(() => {
    engineRef.current.setConfig(soundConfig);
  }, [soundConfig]);

  const playSequence = useCallback(async (sequence: string) => {
    if (isMuted) return;
    
    try {
      await engineRef.current.playSequence(sequence);
      // Update ready state after successful play
      if (!isAudioReady) {
        setIsAudioReady(engineRef.current.isReady());
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
