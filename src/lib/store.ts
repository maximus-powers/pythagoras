"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Command, TrainingSession } from "./db/schema";
import type { SoundConfig, SoundType } from "./audio/sound-engine";

interface MarkingState {
  isMarking: boolean;
  currentCommand: Command | null;
  callId: string | null;
  startTime: number | null;
}

interface SessionState {
  currentSession: TrainingSession | null;
  isPracticeMode: boolean;
}

interface SettingsState {
  trackingEnabled: boolean;
}

interface SimulationState {
  simulationEnabled: boolean;
  simulatedDate: string | null; // ISO date string
}

interface SoundState {
  soundConfig: SoundConfig;
  isMuted: boolean;
}

interface AppState extends MarkingState, SessionState, SettingsState, SoundState, SimulationState {
  // Marking actions
  startMarking: (command: Command, callId: string) => void;
  endMarking: () => void;
  
  // Session actions
  startSession: (session: TrainingSession) => void;
  endSession: () => void;
  setPracticeMode: (enabled: boolean) => void;
  
  // Settings actions
  setTrackingEnabled: (enabled: boolean) => void;
  
  // Sound actions
  setSoundConfig: (config: Partial<SoundConfig>) => void;
  setMuted: (muted: boolean) => void;
  
  // Simulation actions
  setSimulationEnabled: (enabled: boolean) => void;
  setSimulatedDate: (date: string | null) => void;
}

const DEFAULT_SOUND_CONFIG: SoundConfig = {
  soundType: "beep" as SoundType,
  frequency: 800,
  shortDurationMs: 100,
  longDurationMs: 300,
  silenceDurationMs: 150,
  gapDurationMs: 120,
};

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      // Marking state
      isMarking: false,
      currentCommand: null,
      callId: null,
      startTime: null,
      
      // Session state
      currentSession: null,
      isPracticeMode: false,
      
      // Settings state
      trackingEnabled: true,
      
      // Sound state
      soundConfig: DEFAULT_SOUND_CONFIG,
      isMuted: false,
      
      // Simulation state
      simulationEnabled: false,
      simulatedDate: null,

      // Marking actions
      startMarking: (command, callId) =>
        set({
          isMarking: true,
          currentCommand: command,
          callId,
          startTime: Date.now(),
        }),
        
      endMarking: () =>
        set({
          isMarking: false,
          currentCommand: null,
          callId: null,
          startTime: null,
        }),

      // Session actions
      startSession: (session) =>
        set({
          currentSession: session,
          isPracticeMode: false,
        }),
        
      endSession: () =>
        set({
          currentSession: null,
        }),
        
      setPracticeMode: (enabled) =>
        set({
          isPracticeMode: enabled,
          currentSession: null,
        }),
        
      // Settings actions
      setTrackingEnabled: (enabled) =>
        set({
          trackingEnabled: enabled,
        }),
        
      // Sound actions
      setSoundConfig: (config) =>
        set((state) => ({
          soundConfig: { ...state.soundConfig, ...config },
        })),
        
      setMuted: (muted) =>
        set({
          isMuted: muted,
        }),
        
      // Simulation actions
      setSimulationEnabled: (enabled) =>
        set({
          simulationEnabled: enabled,
          // Reset to null when disabling
          simulatedDate: enabled ? new Date().toISOString() : null,
        }),
        
      setSimulatedDate: (date) =>
        set({
          simulatedDate: date,
        }),
    }),
    {
      name: "pythagoras-app-state",
      partialize: (state) => ({
        currentSession: state.currentSession,
        isPracticeMode: state.isPracticeMode,
        trackingEnabled: state.trackingEnabled,
        soundConfig: state.soundConfig,
        isMuted: state.isMuted,
        simulationEnabled: state.simulationEnabled,
        simulatedDate: state.simulatedDate,
      }),
    }
  )
);
