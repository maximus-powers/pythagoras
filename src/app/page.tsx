"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { ThumbsUp, ThumbsDown, Volume2 } from "lucide-react";
import { Header } from "@/components/layout/header";
import { BottomNav } from "@/components/layout/bottom-nav";
import { CommandGrid } from "@/components/command/command-grid";
import { MarkingPanel } from "@/components/marking/marking-panel";
import { QuickSettings } from "@/components/settings/quick-settings";
import { Button } from "@/components/ui/button";
import { SequenceDisplayInline } from "@/components/ui/sequence-display";
import { useAppStore } from "@/lib/store";
import { useSoundEngine } from "@/hooks/use-sound-engine";
import { generateId } from "@/lib/utils";
import type { Command } from "@/lib/db/schema";

export default function CommandBoard() {
  const [commands, setCommands] = useState<Command[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const { isMarking, startMarking, trackingEnabled } = useAppStore();
  const { playSequence, isAudioReady, isMuted } = useSoundEngine();

  // Separate marks from other commands
  const { marks, otherCommands } = useMemo(() => {
    const marks = commands.filter((c) => c.parentFamily === "Marks");
    const otherCommands = commands.filter((c) => c.parentFamily !== "Marks");
    return { marks, otherCommands };
  }, [commands]);

  const positiveMarks = marks.filter((m) => m.family === "Positive").sort((a, b) => a.sequence.localeCompare(b.sequence));
  const negativeMarks = marks.filter((m) => m.family === "Negative").sort((a, b) => a.sequence.localeCompare(b.sequence));

  useEffect(() => {
    async function fetchCommands() {
      try {
        const response = await fetch("/api/commands");
        if (response.ok) {
          const data = await response.json();
          setCommands(data);
        }
      } catch (error) {
        console.error("Failed to fetch commands:", error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchCommands();
  }, []);

  const handleCommandClick = useCallback(async (command: Command) => {
    // Play the command sound
    await playSequence(command.sequence);
    
    // Increment exposure count for training communication tracking
    fetch("/api/commands/exposure", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ commandId: command.id }),
    }).catch(console.error);
    
    // Only start marking flow if tracking is enabled
    if (trackingEnabled) {
      const callId = generateId();
      startMarking(command, callId);
    }
  }, [startMarking, playSequence, trackingEnabled]);

  const handleMarkClick = useCallback(async (command: Command) => {
    // Just play the sound for marks, no marking flow
    await playSequence(command.sequence);
  }, [playSequence]);

  const handleMarkingComplete = useCallback(() => {
    // Marking panel handles its own state, this is just for any additional cleanup
  }, []);

  return (
    <div className="min-h-screen pb-20">
      <Header 
        showSettingsToggle 
        isSettingsOpen={isSettingsOpen}
        onSettingsToggle={() => setIsSettingsOpen(!isSettingsOpen)}
      />
      
      <div className="max-w-lg mx-auto">
        <QuickSettings isOpen={isSettingsOpen} />
      </div>
      
      <main className="p-4 max-w-lg mx-auto">
        {/* Audio unlock banner for iOS */}
        {!isAudioReady && !isMuted && !isLoading && (
          <div className="mb-4 p-3 bg-amber-900/50 border border-amber-700 rounded-lg flex items-center gap-3 text-amber-200 text-sm">
            <Volume2 className="h-5 w-5 flex-shrink-0" />
            <span>Tap any button to enable sound</span>
          </div>
        )}
        
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-muted-foreground">Loading commands...</div>
          </div>
        ) : commands.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-center">
            <p className="text-muted-foreground mb-2">No commands found</p>
            <p className="text-sm text-muted-foreground">
              Add commands in the Vocabulary section or run the seed script.
            </p>
          </div>
        ) : (
          <>
            {/* Marks at the top - side by side */}
            {marks.length > 0 && (
              <div className="mb-4">
                <div className="grid grid-cols-2 gap-3">
                  {positiveMarks.map((mark) => (
                    <Button
                      key={mark.id}
                      className="h-16 bg-green-600 hover:bg-green-700 flex flex-col gap-1"
                      onClick={() => handleMarkClick(mark)}
                      disabled={isMarking}
                    >
                      <ThumbsUp className="h-6 w-6 text-white" />
                      <SequenceDisplayInline sequence={mark.sequence} color="white" />
                    </Button>
                  ))}
                  {negativeMarks.map((mark) => (
                    <Button
                      key={mark.id}
                      variant="destructive"
                      className="h-16 bg-red-600 hover:bg-red-700 flex flex-col gap-1"
                      onClick={() => handleMarkClick(mark)}
                      disabled={isMarking}
                    >
                      <ThumbsDown className="h-6 w-6 text-white" />
                      <SequenceDisplayInline sequence={mark.sequence} color="white" />
                    </Button>
                  ))}
                </div>
              </div>
            )}

            {/* Other commands in accordion */}
            <CommandGrid
              commands={otherCommands}
              onCommandClick={handleCommandClick}
              disabled={isMarking}
            />
          </>
        )}
      </main>

      <BottomNav />

      {/* Marking overlay */}
      {isMarking && (
        <MarkingPanel onComplete={handleMarkingComplete} />
      )}
    </div>
  );
}
