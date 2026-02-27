"use client";

import { useEffect, useState, useCallback } from "react";
import { X, Check, RefreshCw, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SequenceDisplay } from "@/components/ui/sequence-display";
import { useAppStore } from "@/lib/store";
import { useSoundEngine } from "@/hooks/use-sound-engine";
import { formatDuration, generateId } from "@/lib/utils";
import type { Command } from "@/lib/db/schema";

interface MarkingPanelProps {
  onComplete: () => void;
}

export function MarkingPanel({ onComplete }: MarkingPanelProps) {
  const { currentCommand, callId, startTime, endMarking, currentSession, isPracticeMode } = useAppStore();
  const { playSequence } = useSoundEngine();
  const [elapsed, setElapsed] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [negativeCount, setNegativeCount] = useState(0);

  // Update elapsed time
  useEffect(() => {
    if (!startTime) return;
    
    const updateElapsed = () => {
      setElapsed(Date.now() - startTime);
    };
    
    updateElapsed();
    const interval = setInterval(updateElapsed, 100);
    
    return () => clearInterval(interval);
  }, [startTime]);

  const recordMark = useCallback(async (result: "positive" | "negative", responseTimeMs?: number) => {
    if (isPracticeMode || !callId || !currentCommand) return;
    
    try {
      await fetch("/api/records", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: currentSession?.id || null,
          callId,
          commandId: currentCommand.id,
          result,
          responseTimeMs: result === "positive" ? responseTimeMs : null,
        }),
      });
    } catch (error) {
      console.error("Failed to record mark:", error);
    }
  }, [callId, currentCommand, currentSession, isPracticeMode]);

  const handleNegativeMark = async () => {
    if (!currentCommand) return;
    
    setIsSubmitting(true);
    
    // Play negative mark sound
    const negativeCommand = { sequence: "..." }; // Negative mark sequence
    await playSequence(negativeCommand.sequence);
    
    // Record the negative mark
    await recordMark("negative");
    setNegativeCount((prev) => prev + 1);
    
    setIsSubmitting(false);
    // Don't close the panel - stay open for potential positive mark
  };

  const handlePositiveMark = async () => {
    if (!currentCommand || !startTime) return;
    
    setIsSubmitting(true);
    
    // Play positive mark sound
    const positiveCommand = { sequence: ".." }; // Positive mark sequence
    await playSequence(positiveCommand.sequence);
    
    // Record the positive mark with response time
    const responseTimeMs = Date.now() - startTime;
    await recordMark("positive", responseTimeMs);
    
    setIsSubmitting(false);
    endMarking();
    onComplete();
  };

  const handleRepeat = async () => {
    if (!currentCommand) return;
    
    // Reset timer and play the command again
    useAppStore.setState({ startTime: Date.now() });
    setElapsed(0);
    await playSequence(currentCommand.sequence);
  };

  const handleExit = () => {
    endMarking();
    onComplete();
  };

  if (!currentCommand) return null;

  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col">
      {/* Header */}
      <div className="border-b border-border p-4">
        <div className="max-w-lg mx-auto flex flex-col items-center">
          <h2 className="text-2xl font-bold">{currentCommand.word}</h2>
          <SequenceDisplay sequence={currentCommand.sequence} size="lg" className="text-muted-foreground mt-2" />
        </div>
      </div>

      {/* Timer and stats */}
      <div className="flex-1 flex flex-col items-center justify-center gap-6 p-4">
        <div className="text-center">
          <div className="text-5xl font-mono font-bold tabular-nums">
            {formatDuration(elapsed)}
          </div>
          <p className="text-muted-foreground mt-2">Waiting for response...</p>
        </div>

        {negativeCount > 0 && (
          <div className="text-sm text-red-500">
            {negativeCount} negative mark{negativeCount > 1 ? "s" : ""}
          </div>
        )}
      </div>

      {/* Action buttons */}
      <div className="p-4 border-t border-border">
        <div className="max-w-lg mx-auto space-y-3">
          {/* Primary actions */}
          <div className="grid grid-cols-2 gap-3">
            <Button
              variant="destructive"
              size="lg"
              className="h-20 text-lg bg-red-600 hover:bg-red-700"
              onClick={handleNegativeMark}
              disabled={isSubmitting}
            >
              <X className="h-6 w-6 mr-2" />
              Didn&apos;t Listen
            </Button>
            <Button
              size="lg"
              className="h-20 text-lg bg-green-600 hover:bg-green-700"
              onClick={handlePositiveMark}
              disabled={isSubmitting}
            >
              <Check className="h-6 w-6 mr-2" />
              Listened
            </Button>
          </div>

          {/* Secondary actions */}
          <div className="grid grid-cols-2 gap-3">
            <Button
              variant="outline"
              size="lg"
              onClick={handleRepeat}
              disabled={isSubmitting}
            >
              <RefreshCw className="h-5 w-5 mr-2" />
              Repeat
            </Button>
            <Button
              variant="ghost"
              size="lg"
              onClick={handleExit}
              disabled={isSubmitting}
            >
              <ArrowLeft className="h-5 w-5 mr-2" />
              Exit
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
