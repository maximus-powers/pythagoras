"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { ThumbsUp, ThumbsDown, Volume2, Bug } from "lucide-react";
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
  const [debugLog, setDebugLog] = useState<string[]>([]);
  const [showDebug, setShowDebug] = useState(false);
  const { isMarking, startMarking, trackingEnabled } = useAppStore();
  const { playSequence, isAudioReady, isMuted, getDebugInfo, testBeep, testHtmlAudio } = useSoundEngine();
  const [audioDebug, setAudioDebug] = useState({ state: "unknown", sampleRate: 0, unlocked: false });

  const log = useCallback((msg: string) => {
    setDebugLog(prev => [...prev.slice(-9), `${new Date().toLocaleTimeString()}: ${msg}`]);
  }, []);

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
    log(`Tap: ${command.word}`);
    try {
      // Play the command sound
      await playSequence(command.sequence);
      const debug = getDebugInfo();
      setAudioDebug(debug);
      log(`Played: ${command.sequence} (ctx: ${debug.state})`);
      
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
    } catch (err) {
      log(`Error: ${err}`);
    }
  }, [startMarking, playSequence, trackingEnabled, log, getDebugInfo]);

  const handleMarkClick = useCallback(async (command: Command) => {
    log(`Mark tap: ${command.word}`);
    try {
      // Just play the sound for marks, no marking flow
      await playSequence(command.sequence);
      const debug = getDebugInfo();
      setAudioDebug(debug);
      log(`Played mark: ${command.sequence} (ctx: ${debug.state})`);
    } catch (err) {
      log(`Mark error: ${err}`);
    }
  }, [playSequence, log, getDebugInfo]);

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

      {/* Debug toggle */}
      <button
        onClick={() => setShowDebug(!showDebug)}
        className="fixed bottom-24 right-4 z-50 p-2 bg-purple-600 rounded-full shadow-lg"
      >
        <Bug className="h-5 w-5 text-white" />
      </button>

      {/* Debug panel */}
      {showDebug && (
        <div className="fixed bottom-32 right-4 left-4 z-50 p-3 bg-black/90 border border-purple-500 rounded-lg text-xs font-mono text-green-400 max-h-48 overflow-auto">
          <div className="mb-2 text-purple-400">Debug Log (v9 - reverted to v6):</div>
          <div>Audio ready: {isAudioReady ? "yes" : "no"}</div>
          <div>Muted: {isMuted ? "yes" : "no"}</div>
          <div>Commands loaded: {commands.length}</div>
          <div className={audioDebug.state === "running" ? "text-green-400" : "text-red-400"}>
            AudioContext: {audioDebug.state} | {audioDebug.sampleRate}Hz | unlocked: {audioDebug.unlocked ? "yes" : "no"}
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            <button
              onClick={async () => {
                const result = await testBeep();
                log(`WebAudio: ${result}`);
                setAudioDebug(getDebugInfo());
              }}
              className="px-3 py-1 bg-purple-600 text-white rounded text-xs"
            >
              WEB AUDIO
            </button>
            <button
              onClick={async () => {
                const result = await testHtmlAudio();
                log(`${result}`);
              }}
              className="px-3 py-1 bg-green-600 text-white rounded text-xs"
            >
              HTML AUDIO
            </button>
            <button
              onClick={() => {
                // Create context and immediately resume
                try {
                  const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
                  const ctx = new AC();
                  
                  // Resume and play after resume completes
                  ctx.resume().then(() => {
                    const osc = ctx.createOscillator();
                    const gain = ctx.createGain();
                    osc.frequency.value = 440;
                    gain.gain.value = 1;
                    osc.connect(gain);
                    gain.connect(ctx.destination);
                    osc.start();
                    osc.stop(ctx.currentTime + 0.5);
                    log(`SYNC+RESUME: ctx=${ctx.state}, playing 440Hz`);
                  });
                  
                  log(`SYNC: created ctx=${ctx.state}, resuming...`);
                } catch (e) {
                  log(`SYNC ERR: ${e}`);
                }
              }}
              className="px-3 py-1 bg-red-600 text-white rounded text-xs"
            >
              SYNC TEST
            </button>
            <button
              onClick={() => {
                // Try playing an actual MP3 file from a CDN
                const audio = new Audio("https://cdn.freesound.org/previews/254/254819_4486188-lq.mp3");
                audio.play()
                  .then(() => log("MP3: play() succeeded"))
                  .catch((e) => log(`MP3: ${e.name} - ${e.message}`));
              }}
              className="px-3 py-1 bg-yellow-600 text-white rounded text-xs"
            >
              MP3 TEST
            </button>
          </div>
          <div className="mt-2 border-t border-purple-500/50 pt-2">
            {debugLog.length === 0 ? (
              <div className="text-gray-500">No events yet - tap a button</div>
            ) : (
              debugLog.map((line, i) => <div key={i}>{line}</div>)
            )}
          </div>
        </div>
      )}

      {/* Marking overlay */}
      {isMarking && (
        <MarkingPanel onComplete={handleMarkingComplete} />
      )}
    </div>
  );
}
