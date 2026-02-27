"use client";

import { useEffect, useState, useCallback } from "react";
import { Plus, Pencil, Trash2, Play } from "lucide-react";
import { Header } from "@/components/layout/header";
import { BottomNav } from "@/components/layout/bottom-nav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SequenceDisplay } from "@/components/ui/sequence-display";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useSoundEngine } from "@/hooks/use-sound-engine";
import { toast } from "sonner";
import type { Command } from "@/lib/db/schema";

const PARENT_FAMILIES = [
  "Marks",
  "Question",
  "Names",
  "Temporal",
  "Command",
  "Nouns",
  "Modifiers",
  "Feelings",
];

const FAMILIES: Record<string, string[]> = {
  Marks: ["Positive", "Negative"],
  Command: ["Stationary", "Movement", "Communication"],
  Nouns: ["Outside", "Inside", "Sustenance", "Play Objects"],
};

interface GroupedCommands {
  [parentFamily: string]: {
    [family: string]: Command[];
  };
}

export default function VocabularyPage() {
  const [commands, setCommands] = useState<Command[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCommand, setEditingCommand] = useState<Command | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { playSequence } = useSoundEngine();

  // Form state
  const [word, setWord] = useState("");
  const [sequence, setSequence] = useState("");
  const [parentFamily, setParentFamily] = useState("");
  const [family, setFamily] = useState("");
  const [description, setDescription] = useState("");

  const fetchCommands = useCallback(async () => {
    try {
      const response = await fetch("/api/commands");
      if (response.ok) {
        const data = await response.json();
        setCommands(data);
      }
    } catch (error) {
      console.error("Failed to fetch commands:", error);
      toast.error("Failed to load commands");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCommands();
  }, [fetchCommands]);

  const resetForm = () => {
    setWord("");
    setSequence("");
    setParentFamily("");
    setFamily("");
    setDescription("");
    setEditingCommand(null);
  };

  const openAddDialog = () => {
    resetForm();
    setIsDialogOpen(true);
  };

  const openEditDialog = (command: Command) => {
    setEditingCommand(command);
    setWord(command.word);
    setSequence(command.sequence);
    setParentFamily(command.parentFamily);
    setFamily(command.family || "");
    setDescription(command.description || "");
    setIsDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!word || !sequence || !parentFamily) {
      toast.error("Please fill in all required fields");
      return;
    }

    setIsSubmitting(true);

    try {
      const payload = {
        word,
        sequence,
        parentFamily,
        family: family || null,
        description: description || null,
      };

      let response;
      if (editingCommand) {
        response = await fetch(`/api/commands/${editingCommand.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      } else {
        response = await fetch("/api/commands", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }

      if (response.ok) {
        toast.success(editingCommand ? "Command updated" : "Command added");
        setIsDialogOpen(false);
        resetForm();
        fetchCommands();
      } else {
        const error = await response.json();
        toast.error(error.message || "Failed to save command");
      }
    } catch (error) {
      console.error("Failed to save command:", error);
      toast.error("Failed to save command");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (command: Command) => {
    if (!confirm(`Delete "${command.word}"?`)) return;

    try {
      const response = await fetch(`/api/commands/${command.id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        toast.success("Command deleted");
        fetchCommands();
      } else {
        toast.error("Failed to delete command");
      }
    } catch (error) {
      console.error("Failed to delete command:", error);
      toast.error("Failed to delete command");
    }
  };

  const handlePreview = async (sequence: string) => {
    await playSequence(sequence);
  };

  // Group commands, sorted by sequence (lexicographic - groups prefixes together, shorter first)
  const grouped: GroupedCommands = {};
  const sorted = [...commands].sort((a, b) => a.sequence.localeCompare(b.sequence));
  for (const cmd of sorted) {
    const pf = cmd.parentFamily;
    const f = cmd.family || "_none_";
    if (!grouped[pf]) grouped[pf] = {};
    if (!grouped[pf][f]) grouped[pf][f] = [];
    grouped[pf][f].push(cmd);
  }

  const availableFamilies = FAMILIES[parentFamily] || [];

  return (
    <div className="min-h-screen pb-20">
      <Header />

      <main className="p-4 max-w-lg mx-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Vocabulary</h2>
          <Button size="sm" onClick={openAddDialog}>
            <Plus className="h-4 w-4 mr-2" />
            Add
          </Button>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-muted-foreground">Loading...</div>
          </div>
        ) : commands.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-center">
            <p className="text-muted-foreground mb-4">No commands yet</p>
            <Button onClick={openAddDialog}>
              <Plus className="h-4 w-4 mr-2" />
              Add your first command
            </Button>
          </div>
        ) : (
          <Accordion type="multiple" defaultValue={Object.keys(grouped)} className="w-full">
            {Object.entries(grouped).map(([pf, families]) => (
              <AccordionItem key={pf} value={pf}>
                <AccordionTrigger className="text-sm font-semibold">
                  {pf}
                </AccordionTrigger>
                <AccordionContent>
                  {Object.entries(families).map(([fam, cmds]) => (
                    <div key={fam} className="mb-4 last:mb-0">
                      {fam !== "_none_" && (
                        <h4 className="text-xs font-medium text-muted-foreground mb-2 px-1">
                          {fam}
                        </h4>
                      )}
                      <div className="space-y-2">
                        {cmds.map((cmd) => (
                          <div
                            key={cmd.id}
                            className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border border-border"
                          >
                            <div className="flex-1 min-w-0">
                              <div className="font-medium truncate">{cmd.word}</div>
                              <SequenceDisplay sequence={cmd.sequence} size="sm" className="text-muted-foreground mt-1" />
                            </div>
                            <div className="flex items-center gap-1 ml-2">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => handlePreview(cmd.sequence)}
                              >
                                <Play className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => openEditDialog(cmd)}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-destructive hover:text-destructive"
                                onClick={() => handleDelete(cmd)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        )}
      </main>

      <BottomNav />

      {/* Add/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingCommand ? "Edit Command" : "Add Command"}</DialogTitle>
            <DialogDescription>
              Use &quot;.&quot; for short, &quot;_&quot; for long, &quot;0&quot; for silence
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="word">Word *</Label>
              <Input
                id="word"
                value={word}
                onChange={(e) => setWord(e.target.value)}
                placeholder="e.g., Sit"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="sequence">Sequence *</Label>
              <div className="flex gap-2">
                <Input
                  id="sequence"
                  value={sequence}
                  onChange={(e) => setSequence(e.target.value)}
                  placeholder="e.g., _.0."
                  className="font-mono"
                  required
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => handlePreview(sequence)}
                  disabled={!sequence}
                >
                  <Play className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="parentFamily">Parent Family *</Label>
              <Select value={parentFamily} onValueChange={setParentFamily} required>
                <SelectTrigger>
                  <SelectValue placeholder="Select parent family" />
                </SelectTrigger>
                <SelectContent>
                  {PARENT_FAMILIES.map((pf) => (
                    <SelectItem key={pf} value={pf}>
                      {pf}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {availableFamilies.length > 0 && (
              <div className="space-y-2">
                <Label htmlFor="family">Family</Label>
                <Select value={family || "_none_"} onValueChange={(v) => setFamily(v === "_none_" ? "" : v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select family (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_none_">None</SelectItem>
                    {availableFamilies.map((f) => (
                      <SelectItem key={f} value={f}>
                        {f}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Optional description"
              />
            </div>

            <div className="flex gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsDialogOpen(false)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting} className="flex-1">
                {isSubmitting ? "Saving..." : editingCommand ? "Update" : "Add"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
