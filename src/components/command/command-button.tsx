"use client";

import { Button } from "@/components/ui/button";
import { SequenceDisplayInline } from "@/components/ui/sequence-display";
import { cn } from "@/lib/utils";
import type { Command } from "@/lib/db/schema";

interface CommandButtonProps {
  command: Command;
  onClick: (command: Command) => void;
  disabled?: boolean;
  variant?: "default" | "positive" | "negative";
}

export function CommandButton({ command, onClick, disabled, variant = "default" }: CommandButtonProps) {
  const handleClick = () => {
    onClick(command);
  };

  return (
    <Button
      variant={variant === "default" ? "secondary" : variant === "positive" ? "default" : "destructive"}
      className={cn(
        "h-16 flex flex-col items-center justify-center gap-1 text-sm",
        variant === "positive" && "bg-green-600 hover:bg-green-700",
        variant === "negative" && "bg-red-600 hover:bg-red-700"
      )}
      onClick={handleClick}
      disabled={disabled}
    >
      <span className="font-medium truncate max-w-full">{command.word}</span>
      <SequenceDisplayInline sequence={command.sequence} className="opacity-70" />
    </Button>
  );
}
