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
import { groupCommandsByTree } from "@/lib/commands/tree-order";
import type { Command } from "@/lib/db/schema";

interface CommandGridProps {
  commands: Command[];
  onCommandClick: (command: Command) => void;
  disabled?: boolean;
}

export function CommandGrid({ commands, onCommandClick, disabled }: CommandGridProps) {
  const grouped = useMemo(() => groupCommandsByTree(commands), [commands]);
  const parentGroups = grouped.groups.map((group) => group.key);

  return (
    <Accordion type="multiple" defaultValue={parentGroups} className="w-full">
      {grouped.groups.map((parentGroup) => {
        const parentPrefix = parentGroup.prefix;
        return (
          <AccordionItem key={parentGroup.key} value={parentGroup.key}>
            <AccordionTrigger className="text-sm font-semibold">
              <span className="flex items-center gap-2">
                <span className="font-mono">{parentPrefix || "root"}</span>
                {parentPrefix && (
                  <SequenceDisplayInline sequence={parentPrefix} className="opacity-50" />
                )}
              </span>
            </AccordionTrigger>
            <AccordionContent>
              {parentGroup.childGroups.map((childGroup) => {
                const childPrefix = childGroup.prefix;
                const showChildPrefix = childPrefix && childPrefix !== parentPrefix;
                return (
                  <div key={childGroup.key} className="mb-4 last:mb-0">
                    {!childGroup.isDirect && (
                      <h4 className="text-xs font-medium text-muted-foreground mb-2 px-1 flex items-center gap-2">
                        <span className="font-mono">{childPrefix}</span>
                        {showChildPrefix && (
                          <SequenceDisplayInline sequence={childPrefix} className="opacity-70" />
                        )}
                      </h4>
                    )}
                    <div className="grid grid-cols-3 gap-2">
                      {childGroup.commands.map((cmd) => (
                        <CommandButton
                          key={cmd.id}
                          command={cmd}
                          onClick={onCommandClick}
                          disabled={disabled}
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
