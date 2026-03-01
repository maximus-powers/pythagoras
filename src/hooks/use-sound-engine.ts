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

  /**
   * Call this SYNCHRONOUSLY at the start of any click/tap handler
   * Required for iOS PWA audio to work
   */
  const unlockAudio = useCallback(() => {
    engineRef.current.unlockSync();
  }, []);

  const playSequence = useCallback(async (sequence: string) => {
    if (isMuted) return;
    
    try {
      const engine = engineRef.current;
      // Note: unlockSync should already be called by the tap handler
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

  const getDebugInfo = useCallback(() => {
    return engineRef.current.getDebugInfo();
  }, []);

  const testBeep = useCallback(async () => {
    return engineRef.current.testBeep();
  }, []);

  const testHtmlAudio = useCallback(async () => {
    return engineRef.current.testHtmlAudio();
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
    testBeep,
    testHtmlAudio,
    unlockAudio,
  };
}
