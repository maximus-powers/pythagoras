"use client";

import { cn } from "@/lib/utils";
import { useSoundEngine } from "@/hooks/use-sound-engine";

interface SequenceDisplayProps {
  sequence: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

// Parse sequence into tokens
function parseSequence(sequence: string): Array<"." | "_" | "0"> {
  const tokens: Array<"." | "_" | "0"> = [];
  for (const char of sequence) {
    if (char === "." || char === "_" || char === "0") {
      tokens.push(char);
    }
  }
  return tokens;
}

// Base height for each size
const heightClasses = {
  sm: "h-3",
  md: "h-4",
  lg: "h-5",
};

// Base unit width (in pixels) for scaling
const baseUnit = {
  sm: 0.04,  // multiplier for duration in ms
  md: 0.05,
  lg: 0.06,
};

// Fixed durations (matching the pre-recorded sound files)
const SHORT_DURATION_MS = 100;
const LONG_DURATION_MS = 300;

export function SequenceDisplay({ sequence, size = "md", className }: SequenceDisplayProps) {
  const { config } = useSoundEngine();
  const tokens = parseSequence(sequence);
  const height = heightClasses[size];
  const unit = baseUnit[size];

  // Calculate widths based on fixed durations
  const shortWidth = Math.max(4, SHORT_DURATION_MS * unit);
  const longWidth = Math.max(8, LONG_DURATION_MS * unit);
  const silenceWidth = Math.max(4, config.silenceDurationMs * unit);

  return (
    <div className={cn("flex items-center gap-1", className)}>
      {tokens.map((token, index) => {
        if (token === ".") {
          return (
            <div
              key={index}
              className={cn(height, "bg-blue-500 rounded-[2px]")}
              style={{ width: `${shortWidth}px` }}
              title={`short (${SHORT_DURATION_MS}ms)`}
            />
          );
        }
        
        if (token === "_") {
          return (
            <div
              key={index}
              className={cn(height, "bg-blue-500 rounded-[2px]")}
              style={{ width: `${longWidth}px` }}
              title={`long (${LONG_DURATION_MS}ms)`}
            />
          );
        }
        
        if (token === "0") {
          // Silence - just empty space
          return (
            <div
              key={index}
              style={{ width: `${silenceWidth}px` }}
              title={`silence (${config.silenceDurationMs}ms)`}
            />
          );
        }
        
        return null;
      })}
    </div>
  );
}

// Inline version for use in buttons (smaller scale)
export function SequenceDisplayInline({ sequence, className, color = "blue" }: { sequence: string; className?: string; color?: "blue" | "white" }) {
  const { config } = useSoundEngine();
  const tokens = parseSequence(sequence);

  // Smaller scale for inline display
  const unit = 0.025;
  const shortWidth = Math.max(3, SHORT_DURATION_MS * unit);
  const longWidth = Math.max(6, LONG_DURATION_MS * unit);
  const silenceWidth = Math.max(3, config.silenceDurationMs * unit);
  
  const bgColor = color === "white" ? "bg-white" : "bg-blue-500";

  return (
    <div className={cn("flex items-center gap-0.5", className)}>
      {tokens.map((token, index) => {
        if (token === ".") {
          return (
            <div
              key={index}
              className={cn("h-2 rounded-[1px]", bgColor)}
              style={{ width: `${shortWidth}px` }}
            />
          );
        }
        
        if (token === "_") {
          return (
            <div
              key={index}
              className={cn("h-2 rounded-[1px]", bgColor)}
              style={{ width: `${longWidth}px` }}
            />
          );
        }
        
        if (token === "0") {
          return (
            <div
              key={index}
              style={{ width: `${silenceWidth}px` }}
            />
          );
        }
        
        return null;
      })}
    </div>
  );
}
