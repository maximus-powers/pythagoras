"use client";

import { useState } from "react";
import { Play, Square, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAppStore } from "@/lib/store";
import type { TrainingSession } from "@/lib/db/schema";

interface SessionControlsProps {
  onSessionStart?: (session: TrainingSession) => void;
  onSessionEnd?: (session: TrainingSession) => void;
}

export function SessionControls({ onSessionStart, onSessionEnd }: SessionControlsProps) {
  const { currentSession, isPracticeMode, startSession, endSession, setPracticeMode } = useAppStore();
  const [isStartDialogOpen, setIsStartDialogOpen] = useState(false);
  const [isEndDialogOpen, setIsEndDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleStartSession = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      
      if (response.ok) {
        const session = await response.json();
        startSession(session);
        onSessionStart?.(session);
      }
    } catch (error) {
      console.error("Failed to start session:", error);
    } finally {
      setIsLoading(false);
      setIsStartDialogOpen(false);
    }
  };

  const handlePracticeMode = () => {
    setPracticeMode(true);
    setIsStartDialogOpen(false);
  };

  const handleEndSession = async () => {
    if (!currentSession) return;
    
    setIsLoading(true);
    try {
      const response = await fetch(`/api/sessions/${currentSession.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ endSession: true }),
      });
      
      if (response.ok) {
        const updatedSession = await response.json();
        endSession();
        onSessionEnd?.(updatedSession);
      }
    } catch (error) {
      console.error("Failed to end session:", error);
    } finally {
      setIsLoading(false);
      setIsEndDialogOpen(false);
    }
  };

  // Show start dialog if no session and not in practice mode
  const showStartPrompt = !currentSession && !isPracticeMode;

  return (
    <>
      {/* Session start prompt */}
      <Dialog open={showStartPrompt && isStartDialogOpen} onOpenChange={setIsStartDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Start Training Session?</DialogTitle>
            <DialogDescription>
              Track your training progress or practice without recording.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-3 mt-4">
            <Button onClick={handleStartSession} disabled={isLoading} className="w-full">
              <Play className="h-4 w-4 mr-2" />
              Start Session
            </Button>
            <Button variant="outline" onClick={handlePracticeMode} className="w-full">
              <Zap className="h-4 w-4 mr-2" />
              Practice Mode
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Session controls banner */}
      {showStartPrompt && (
        <div className="bg-muted/50 border-b border-border px-4 py-3">
          <div className="flex items-center justify-between max-w-lg mx-auto">
            <span className="text-sm text-muted-foreground">No active session</span>
            <Button size="sm" onClick={() => setIsStartDialogOpen(true)}>
              <Play className="h-4 w-4 mr-2" />
              Start
            </Button>
          </div>
        </div>
      )}

      {/* Active session controls */}
      {currentSession && (
        <div className="bg-primary/10 border-b border-primary/20 px-4 py-2">
          <div className="flex items-center justify-between max-w-lg mx-auto">
            <span className="text-sm font-medium">Session Active</span>
            <Button size="sm" variant="destructive" onClick={() => setIsEndDialogOpen(true)}>
              <Square className="h-4 w-4 mr-2" />
              End
            </Button>
          </div>
        </div>
      )}

      {/* End session confirmation */}
      <Dialog open={isEndDialogOpen} onOpenChange={setIsEndDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>End Training Session?</DialogTitle>
            <DialogDescription>
              Your session data will be saved for analytics.
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-3 mt-4">
            <Button variant="outline" onClick={() => setIsEndDialogOpen(false)} className="flex-1">
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleEndSession} disabled={isLoading} className="flex-1">
              End Session
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
