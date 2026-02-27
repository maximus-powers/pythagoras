"use client";

import { useMemo } from "react";
import { CommandButton } from "./command-button";
import { SequenceDisplayInline } from "@/components/ui/sequence-display";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import type { Command } from "@/lib/db/schema";

interface CommandGridProps {
  commands: Command[];
  onCommandClick: (command: Command) => void;
  disabled?: boolean;
}

interface GroupedCommands {
  [parentFamily: string]: {
    [family: string]: Command[];
  };
}

// Find the longest common prefix among a list of sequences
function getCommonPrefix(sequences: string[]): string {
  if (sequences.length === 0) return "";
  if (sequences.length === 1) return sequences[0];
  
  const sorted = [...sequences].sort();
  const first = sorted[0];
  const last = sorted[sorted.length - 1];
  
  let prefix = "";
  for (let i = 0; i < first.length && i < last.length; i++) {
    if (first[i] === last[i]) {
      prefix += first[i];
    } else {
      break;
    }
  }
  return prefix;
}

export function CommandGrid({ commands, onCommandClick, disabled }: CommandGridProps) {
  // Group commands by parent family, then by family, sorted by sequence
  const grouped = useMemo(() => {
    const result: GroupedCommands = {};
    
    // Sort commands by sequence first (lexicographic - groups prefixes together, shorter first)
    const sorted = [...commands].sort((a, b) => a.sequence.localeCompare(b.sequence));
    
    for (const cmd of sorted) {
      const pf = cmd.parentFamily;
      const f = cmd.family || "_none_";
      
      if (!result[pf]) {
        result[pf] = {};
      }
      if (!result[pf][f]) {
        result[pf][f] = [];
      }
      result[pf][f].push(cmd);
    }
    
    return result;
  }, [commands]);

  const parentFamilies = Object.keys(grouped);
  
  // Get common prefix for a parent family (all commands in it)
  const getParentFamilyPrefix = (pf: string): string => {
    const allCmds = Object.values(grouped[pf]).flat();
    return getCommonPrefix(allCmds.map(c => c.sequence));
  };
  
  // Get common prefix for a family
  const getFamilyPrefix = (cmds: Command[]): string => {
    return getCommonPrefix(cmds.map(c => c.sequence));
  };

  // Determine button variant based on family (for Marks) or parent family
  const getVariant = (family: string | null): "default" | "positive" | "negative" => {
    const f = family?.toLowerCase() || "";
    if (f.includes("positive")) return "positive";
    if (f.includes("negative")) return "negative";
    return "default";
  };

  return (
    <Accordion type="multiple" defaultValue={parentFamilies} className="w-full">
      {parentFamilies.map((parentFamily) => {
        const parentPrefix = getParentFamilyPrefix(parentFamily);
        return (
          <AccordionItem key={parentFamily} value={parentFamily}>
            <AccordionTrigger className="text-sm font-semibold">
              <span className="flex items-center gap-2">
                {parentFamily}
                {parentPrefix && (
                  <SequenceDisplayInline sequence={parentPrefix} className="opacity-50" />
                )}
              </span>
            </AccordionTrigger>
            <AccordionContent>
              {Object.entries(grouped[parentFamily]).map(([family, cmds]) => {
                const familyPrefix = getFamilyPrefix(cmds);
                // Only show family prefix if it's different from parent prefix
                const showFamilyPrefix = familyPrefix && familyPrefix !== parentPrefix;
                return (
                  <div key={family} className="mb-4 last:mb-0">
                    {family !== "_none_" && (
                      <h4 className="text-xs font-medium text-muted-foreground mb-2 px-1 flex items-center gap-2">
                        {family}
                        {showFamilyPrefix && (
                          <SequenceDisplayInline sequence={familyPrefix} className="opacity-70" />
                        )}
                      </h4>
                    )}
                    <div className="grid grid-cols-3 gap-2">
                      {cmds.map((cmd) => (
                        <CommandButton
                          key={cmd.id}
                          command={cmd}
                          onClick={onCommandClick}
                          disabled={disabled}
                          variant={getVariant(cmd.family)}
                        />
                      ))}
                    </div>
                  </div>
                );
              })}
            </AccordionContent>
          </AccordionItem>
        );
      })}
    </Accordion>
  );
}
