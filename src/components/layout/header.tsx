"use client";

import { Volume2, VolumeX, Play, Square, ClipboardList, ClipboardX, Settings, Dog, FlaskConical, X } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useSoundEngine } from "@/hooks/use-sound-engine";
import { useAppStore } from "@/lib/store";
import { Badge } from "@/components/ui/badge";
import { useEffect, useState } from "react";
import { formatDuration } from "@/lib/utils";

interface HeaderProps {
  showSettingsToggle?: boolean;
  isSettingsOpen?: boolean;
  onSettingsToggle?: () => void;
}

export function Header({ showSettingsToggle, isSettingsOpen, onSettingsToggle }: HeaderProps) {
  const { isMuted, toggleMute } = useSoundEngine();
  const { 
    currentSession, 
    isPracticeMode, 
    trackingEnabled, 
    setTrackingEnabled,
    startSession,
    endSession,
    simulationEnabled,
    simulatedDate,
    setSimulationEnabled,
  } = useAppStore();
  const [elapsed, setElapsed] = useState(0);
  const [isEndDialogOpen, setIsEndDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!currentSession) {
      setElapsed(0);
      return;
    }

    const startTime = new Date(currentSession.startedAt).getTime();
    
    const updateElapsed = () => {
      setElapsed(Date.now() - startTime);
    };
    
    updateElapsed();
    const interval = setInterval(updateElapsed, 1000);
    
    return () => clearInterval(interval);
  }, [currentSession]);

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
      }
    } catch (error) {
      console.error("Failed to start session:", error);
    } finally {
      setIsLoading(false);
    }
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
        endSession();
      }
    } catch (error) {
      console.error("Failed to end session:", error);
    } finally {
      setIsLoading(false);
      setIsEndDialogOpen(false);
    }
  };

  const handleSessionButtonClick = () => {
    if (currentSession) {
      setIsEndDialogOpen(true);
    } else {
      handleStartSession();
    }
  };

  const simDate = simulatedDate ? new Date(simulatedDate) : null;
  
  return (
    <>
      <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex items-center justify-between h-14 px-4 max-w-lg mx-auto">
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-semibold">Pythagoras</h1>
            <span className="text-[10px] text-muted-foreground">v11</span>
            {simulationEnabled && (
              <Badge variant="outline" className="gap-1 text-purple-500 border-purple-500">
                <FlaskConical className="h-3 w-3" />
                Sim
              </Badge>
            )}
            {currentSession && (
              <Badge variant="secondary" className="gap-1">
                {formatDuration(elapsed)}
              </Badge>
            )}
          </div>
          
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={handleSessionButtonClick}
              disabled={isLoading}
              aria-label={currentSession ? "End session" : "Start session"}
              className={currentSession ? "text-green-500" : "text-muted-foreground"}
            >
              {currentSession ? (
                <Square className="h-5 w-5" />
              ) : (
                <Play className="h-5 w-5" />
              )}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setTrackingEnabled(!trackingEnabled)}
              aria-label={trackingEnabled ? "Disable tracking" : "Enable tracking"}
              className={trackingEnabled ? "" : "text-muted-foreground"}
            >
              {trackingEnabled ? (
                <ClipboardList className="h-5 w-5" />
              ) : (
                <ClipboardX className="h-5 w-5" />
              )}
            </Button>
            {showSettingsToggle && (
              <Button
                variant="ghost"
                size="icon"
                onClick={onSettingsToggle}
                aria-label="Toggle settings"
                className={isSettingsOpen ? "text-primary" : ""}
              >
                <Settings className="h-5 w-5" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleMute}
              aria-label={isMuted ? "Unmute" : "Mute"}
            >
              {isMuted ? (
                <VolumeX className="h-5 w-5" />
              ) : (
                <Volume2 className="h-5 w-5" />
              )}
            </Button>
            <Link href="/profile">
              <Button
                variant="ghost"
                size="icon"
                aria-label="Profile"
              >
                <Dog className="h-5 w-5" />
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Simulation mode banner */}
      {simulationEnabled && simDate && (
        <div className="sticky top-14 z-30 bg-purple-500/10 border-b border-purple-500/30 backdrop-blur">
          <div className="flex items-center justify-between h-10 px-4 max-w-lg mx-auto">
            <div className="flex items-center gap-2 text-sm">
              <FlaskConical className="h-4 w-4 text-purple-500" />
              <span className="text-purple-400 font-medium">
                {simDate.toLocaleDateString("en-US", { 
                  month: "short", 
                  day: "numeric", 
                  year: "numeric" 
                })}
              </span>
              <span className="text-muted-foreground">
                (simulated)
              </span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-purple-400 hover:text-purple-300"
              onClick={() => setSimulationEnabled(false)}
            >
              <X className="h-4 w-4" />
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
