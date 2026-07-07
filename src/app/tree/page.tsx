"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, GitBranch, Info, Sigma } from "lucide-react";
import { Header } from "@/components/layout/header";
import { BottomNav } from "@/components/layout/bottom-nav";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SequenceDisplay } from "@/components/ui/sequence-display";
import {
  compareSequencesByTree,
  getObservedAlphabet,
  parseSequence,
  sortCommandsByTree,
  type SequenceSymbol,
} from "@/lib/commands/tree-order";
import { cn } from "@/lib/utils";
import type { Command } from "@/lib/db/schema";

interface TrieNode {
  token: SequenceSymbol | null;
  prefix: string;
  depth: number;
  commands: Command[];
  children: Map<SequenceSymbol, TrieNode>;
}

interface DuplicateGroup {
  sequence: string;
  commands: Command[];
}

interface TrieLayoutNode {
  node: TrieNode;
  start: number;
  span: number;
}

function makeNode(token: SequenceSymbol | null, prefix: string, depth: number): TrieNode {
  return {
    token,
    prefix,
    depth,
    commands: [],
    children: new Map(),
  };
}

function sortedChildren(node: TrieNode, alphabet: SequenceSymbol[]): TrieNode[] {
  return alphabet
    .map((symbol) => node.children.get(symbol))
    .filter((child): child is TrieNode => Boolean(child));
}

function buildTrie(commands: Command[]): TrieNode {
  const root = makeNode(null, "", 0);

  for (const command of commands) {
    let node = root;

    for (const token of parseSequence(command.sequence)) {
      const nextPrefix = `${node.prefix}${token}`;
      let child = node.children.get(token);

      if (!child) {
        child = makeNode(token, nextPrefix, node.depth + 1);
        node.children.set(token, child);
      }

      node = child;
    }

    node.commands.push(command);
  }

  return root;
}

function collectLevels(root: TrieNode, alphabet: SequenceSymbol[]): TrieNode[][] {
  const levels: TrieNode[][] = [];

  function visit(node: TrieNode) {
    levels[node.depth] ??= [];
    levels[node.depth].push(node);
    for (const child of sortedChildren(node, alphabet)) {
      visit(child);
    }
  }

  visit(root);
  return levels;
}

function flattenTrie(root: TrieNode, alphabet: SequenceSymbol[]): TrieNode[] {
  const nodes: TrieNode[] = [];

  function visit(node: TrieNode) {
    nodes.push(node);
    for (const child of sortedChildren(node, alphabet)) {
      visit(child);
    }
  }

  visit(root);
  return nodes;
}

function countLeafSlots(node: TrieNode, alphabet: SequenceSymbol[]): number {
  const children = sortedChildren(node, alphabet);

  if (children.length === 0) {
    return 1;
  }

  return children.reduce((sum, child) => sum + countLeafSlots(child, alphabet), 0);
}

function collectAlignedLevels(
  root: TrieNode,
  alphabet: SequenceSymbol[]
): { levels: TrieLayoutNode[][]; leafSlots: number } {
  const levels: TrieLayoutNode[][] = [];

  function visit(node: TrieNode, start: number): number {
    const span = countLeafSlots(node, alphabet);
    levels[node.depth] ??= [];
    levels[node.depth].push({ node, start, span });

    let childStart = start;
    for (const child of sortedChildren(node, alphabet)) {
      const childSpan = visit(child, childStart);
      childStart += childSpan;
    }

    return span;
  }

  const leafSlots = visit(root, 1);
  return { levels, leafSlots };
}

function getDuplicateGroups(commands: Command[], alphabet: SequenceSymbol[]): DuplicateGroup[] {
  const bySequence = new Map<string, Command[]>();

  for (const command of commands) {
    const group = bySequence.get(command.sequence) ?? [];
    group.push(command);
    bySequence.set(command.sequence, group);
  }

  return Array.from(bySequence.entries())
    .filter(([, group]) => group.length > 1)
    .map(([sequence, group]) => ({ sequence, commands: group }))
    .sort((a, b) => compareSequencesByTree(a.sequence, b.sequence, alphabet));
}

function hasDescendantCommand(node: TrieNode, alphabet: SequenceSymbol[]): boolean {
  for (const child of sortedChildren(node, alphabet)) {
    if (child.commands.length > 0 || hasDescendantCommand(child, alphabet)) {
      return true;
    }
  }

  return false;
}

function formatNumber(value: number, digits = 2): string {
  return value.toFixed(digits);
}

function getFixedLengthBaseline(commandCount: number, alphabetSize: number): number | null {
  if (commandCount <= 0) return 0;
  if (alphabetSize <= 1) return commandCount <= 1 ? commandCount : null;

  for (let length = 1; length < 32; length += 1) {
    if (Math.pow(alphabetSize, length) >= commandCount) {
      return length;
    }
  }

  return 32;
}

function getEntropyFloor(commandCount: number, alphabetSize: number): number | null {
  if (commandCount <= 1) return 0;
  if (alphabetSize <= 1) return null;

  return Math.log(commandCount) / Math.log(alphabetSize);
}

function getKraftLoad(commands: Command[], alphabetSize: number): number | null {
  if (alphabetSize <= 1) return null;

  return commands.reduce(
    (sum, command) => sum + Math.pow(alphabetSize, -parseSequence(command.sequence).length),
    0
  );
}

function getEndingCounts(commands: Command[], alphabet: SequenceSymbol[]) {
  const counts = new Map<SequenceSymbol, number>();

  for (const symbol of alphabet) {
    counts.set(symbol, 0);
  }

  for (const command of commands) {
    const symbols = parseSequence(command.sequence);
    const ending = symbols[symbols.length - 1];
    if (ending) {
      counts.set(ending, (counts.get(ending) ?? 0) + 1);
    }
  }

  return Array.from(counts.entries())
    .map(([symbol, count]) => ({ symbol, count }))
    .sort((a, b) => b.count - a.count || a.symbol.localeCompare(b.symbol));
}

function formatOptionalNumber(value: number | null, digits = 2): string {
  return value == null || !Number.isFinite(value) ? "n/a" : formatNumber(value, digits);
}

function InfoTip({ content, className }: { content: string; className?: string }) {
  return (
    <div className={cn("group absolute right-2 top-2 z-20", className)}>
      <button
        type="button"
        aria-label={content}
        className="flex h-6 w-6 items-center justify-center rounded-full border border-border bg-background/95 text-muted-foreground shadow-sm transition hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <Info className="h-3.5 w-3.5" />
      </button>
      <div
        role="tooltip"
        className="pointer-events-none absolute right-0 top-7 w-64 max-w-[calc(100vw-2rem)] rounded-md border border-border bg-popover px-3 py-2 text-xs leading-relaxed text-popover-foreground opacity-0 shadow-md transition group-hover:opacity-100 group-focus-within:opacity-100"
      >
        {content}
      </div>
    </div>
  );
}

function MetricCard({
  label,
  value,
  detail,
  info,
}: {
  label: string;
  value: string | number;
  detail?: string;
  info: string;
}) {
  return (
    <div className="relative rounded-md border border-border bg-muted/30 p-3 pr-9">
      <InfoTip content={info} />
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 text-2xl font-semibold tabular-nums">{value}</div>
      {detail && <div className="mt-1 text-xs text-muted-foreground">{detail}</div>}
    </div>
  );
}

function NodeCell({ node, alphabet }: { node: TrieNode; alphabet: SequenceSymbol[] }) {
  const childCount = node.children.size;
  const isTerminal = node.commands.length > 0;
  const isDuplicate = node.commands.length > 1;
  const isPrefix = isTerminal && childCount > 0 && hasDescendantCommand(node, alphabet);
  const isBranchOnly = !isTerminal && childCount > 0;
  const isEmpty = !isTerminal && childCount === 0;
  const commandLabel = node.commands.map((command) => command.word).join(" / ");
  const statusParts = [
    isDuplicate ? "duplicate" : null,
    isPrefix ? "prefix" : null,
  ].filter(Boolean);
  const statusLabel = statusParts.length > 0
    ? statusParts.join(", ")
    : isTerminal ? "clean" : "unused prefix";

  if (isEmpty) {
    return (
      <div
        aria-hidden="true"
        className="h-16 min-w-0 rounded-md border border-border/20 bg-transparent"
      />
    );
  }

  return (
    <div
      tabIndex={0}
      className={cn(
        "group/node relative h-full min-h-16 min-w-0 rounded-md border border-border bg-background p-1.5 outline-none focus-visible:ring-2 focus-visible:ring-ring",
        isBranchOnly && "border-neutral-800 bg-black text-white",
        isTerminal && !isDuplicate && "border-primary/40 bg-primary/5",
        isDuplicate && "border-red-500/70 bg-red-950/70 text-red-50"
      )}
    >
      <div className="truncate font-mono text-xs font-medium">
        {node.prefix || "root"}
      </div>

      {node.prefix && <SequenceDisplay sequence={node.prefix} size="sm" className="mt-2" />}

      {commandLabel && (
        <div className="mt-1 truncate text-xs font-medium leading-snug">
          {commandLabel}
        </div>
      )}

      <div
        role="tooltip"
        className="pointer-events-none absolute left-0 top-[calc(100%+0.375rem)] z-50 w-64 rounded-md border border-border bg-popover p-3 text-popover-foreground opacity-0 shadow-lg transition group-hover/node:opacity-100 group-focus/node:opacity-100"
      >
        <div className="space-y-2 text-xs">
          <div className="flex items-center justify-between gap-3">
            <span className="text-muted-foreground">Sequence</span>
            <span className="font-mono font-medium">{node.prefix || "root"}</span>
          </div>
          {node.prefix && <SequenceDisplay sequence={node.prefix} size="sm" />}
          <div className="flex items-center justify-between gap-3">
            <span className="text-muted-foreground">Length</span>
            <span className="tabular-nums">{parseSequence(node.prefix).length}</span>
          </div>
          <div className="flex items-center justify-between gap-3">
            <span className="text-muted-foreground">Status</span>
            <span>{statusLabel}</span>
          </div>
          <div>
            <div className="text-muted-foreground">
              {node.commands.length > 1 ? "Words" : "Word"}
            </div>
            {node.commands.length > 0 ? (
              <div className="mt-1 space-y-1">
                {node.commands.map((command) => (
                  <div key={command.id} className="font-medium leading-snug">
                    {command.word}
                  </div>
                ))}
              </div>
            ) : (
              <div className="mt-1 font-medium leading-snug">Unused prefix</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LinguisticTreePage() {
  const [commands, setCommands] = useState<Command[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isActive = true;

    async function fetchCommands() {
      try {
        const response = await fetch("/api/commands");
        if (!response.ok) {
          throw new Error("Failed to load commands");
        }

        const data = await response.json();
        if (isActive) {
          setCommands(data);
        }
      } catch (fetchError) {
        if (isActive) {
          setError(fetchError instanceof Error ? fetchError.message : "Failed to load commands");
        }
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    }

    void fetchCommands();

    return () => {
      isActive = false;
    };
  }, []);

  const analysis = useMemo(() => {
    const alphabet = getObservedAlphabet(commands);
    const sortedCommands = sortCommandsByTree(commands, alphabet);
    const alphabetSize = alphabet.length;
    const trie = buildTrie(sortedCommands);
    const levels = collectLevels(trie, alphabet);
    const alignedTree = collectAlignedLevels(trie, alphabet);
    const nodes = flattenTrie(trie, alphabet);
    const duplicateGroups = getDuplicateGroups(sortedCommands, alphabet);
    const terminalNodes = nodes.filter((node) => node.commands.length > 0);
    const prefixTerminalNodes = terminalNodes.filter((node) => node.children.size > 0 && hasDescendantCommand(node, alphabet));
    const endingCounts = getEndingCounts(sortedCommands, alphabet);
    const totalSymbols = sortedCommands.reduce((sum, command) => sum + parseSequence(command.sequence).length, 0);
    const averageLength = sortedCommands.length > 0 ? totalSymbols / sortedCommands.length : 0;
    const entropyFloorSymbols = getEntropyFloor(sortedCommands.length, alphabetSize);
    const fixedLengthBaseline = getFixedLengthBaseline(sortedCommands.length, alphabetSize);
    const kraftLoad = getKraftLoad(sortedCommands, alphabetSize);
    const compressionEfficiency = averageLength > 0 && entropyFloorSymbols != null
      ? (entropyFloorSymbols / averageLength) * 100
      : null;

    return {
      alphabet,
      alphabetSize,
      levels,
      alignedTree,
      nodes,
      duplicateGroups,
      prefixTerminalNodes,
      endingCounts,
      averageLength,
      entropyFloorSymbols,
      fixedLengthBaseline,
      kraftLoad,
      compressionEfficiency,
    };
  }, [commands]);

  return (
    <div className="min-h-screen pb-20">
      <Header />

      <main className="mx-auto max-w-6xl space-y-4 p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold">Linguistic Tree</h2>
            <p className="text-sm text-muted-foreground">Current vocabulary trie</p>
          </div>
          <Badge variant="outline" className="gap-1">
            <GitBranch className="h-3 w-3" />
            {commands.length} commands
          </Badge>
        </div>

        {isLoading ? (
          <div className="flex h-64 items-center justify-center">
            <div className="text-muted-foreground">Loading tree...</div>
          </div>
        ) : error ? (
          <Card>
            <CardContent className="py-8 text-center text-destructive">{error}</CardContent>
          </Card>
        ) : commands.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">No commands found.</CardContent>
          </Card>
        ) : (
          <>
            <section className="grid gap-3 md:grid-cols-3 lg:grid-cols-6">
              <MetricCard
                label="Alphabet"
                value={analysis.alphabetSize}
                detail={analysis.alphabet.join(" ") || "none"}
                info="Distinct symbols observed in the saved command sequences. The tree layout and information-theory calculations use this current alphabet."
              />
              <MetricCard
                label="Avg length"
                value={formatNumber(analysis.averageLength)}
                detail="symbols per command"
                info="Average number of observed symbols per saved command sequence."
              />
              <MetricCard
                label="Entropy floor"
                value={formatOptionalNumber(analysis.entropyFloorSymbols)}
                detail={`uniform ${analysis.alphabetSize}-symbol alphabet`}
                info="The theoretical lower bound for a uniform vocabulary: log base alphabet-size of command count. Real constraints can make the practical average longer."
              />
              <MetricCard
                label="Fixed baseline"
                value={analysis.fixedLengthBaseline ?? "n/a"}
                detail={`${analysis.alphabetSize} symbols`}
                info="The shortest equal-length sequence size that could fit this many commands with the observed alphabet."
              />
              <MetricCard
                label="Compression"
                value={analysis.compressionEfficiency == null ? "n/a" : `${formatNumber(analysis.compressionEfficiency, 0)}%`}
                detail="floor / current avg"
                info="Entropy floor divided by current average length. Higher means the current vocabulary is closer to the uniform theoretical lower bound."
              />
              <MetricCard
                label="Kraft load"
                value={formatOptionalNumber(analysis.kraftLoad)}
                detail={`<= 1 if prefix-free (${analysis.alphabetSize}-ary)`}
                info="The sum of alphabetSize^-length for every command. A prefix-free code must have a Kraft load of 1 or less."
              />
              <MetricCard
                label="Max depth"
                value={analysis.levels.length - 1}
                detail={`${analysis.nodes.length} trie nodes`}
                info="The deepest sequence length represented in the trie. Node count includes both completed commands and intermediate prefixes."
              />
            </section>

            <Card className="relative">
              <InfoTip
                className="right-3 top-3"
                content="Checks whether the current codebook is instantly decodable. Duplicates collide directly; terminal prefixes are complete commands that also begin longer commands."
              />
              <CardHeader className="pr-14">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Sigma className="h-4 w-4" />
                      Code Health
                    </CardTitle>
                    <CardDescription>Uniqueness and prefix diagnostics</CardDescription>
                  </div>
                  {analysis.duplicateGroups.length === 0 &&
                  analysis.prefixTerminalNodes.length === 0 ? (
                    <Badge className="gap-1 bg-green-600 text-white">
                      <CheckCircle2 className="h-3 w-3" />
                      prefix-free
                    </Badge>
                  ) : (
                    <Badge variant="destructive" className="gap-1">
                      <AlertTriangle className="h-3 w-3" />
                      ambiguous
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="grid gap-3 md:grid-cols-3">
                <div className="relative rounded-md border border-border p-3 pr-9">
                  <InfoTip content="Commands that share exactly the same sequence, so the same signal would mean multiple words." />
                  <div className="text-sm font-medium">Duplicate sequences</div>
                  <div className="mt-2 space-y-2">
                    {analysis.duplicateGroups.length === 0 ? (
                      <div className="text-sm text-muted-foreground">None</div>
                    ) : (
                      analysis.duplicateGroups.map((group) => (
                        <div key={group.sequence} className="text-sm">
                          <span className="font-mono">{group.sequence}</span>
                          <span className="text-muted-foreground">: </span>
                          {group.commands.map((command) => command.word).join(" / ")}
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <div className="relative rounded-md border border-border p-3 pr-9">
                  <InfoTip content="Completed commands that have descendants in the trie. Without a separator, these can be ambiguous with longer commands." />
                  <div className="text-sm font-medium">Terminal prefixes</div>
                  <div className="mt-2 space-y-2">
                    {analysis.prefixTerminalNodes.length === 0 ? (
                      <div className="text-sm text-muted-foreground">None</div>
                    ) : (
                      analysis.prefixTerminalNodes.map((node) => (
                        <div key={node.prefix} className="text-sm">
                          <span className="font-mono">{node.prefix}</span>
                          <span className="text-muted-foreground">: </span>
                          {node.commands.map((command) => command.word).join(" / ")}
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <div className="relative rounded-md border border-border p-3 pr-9">
                  <InfoTip content="Counts which observed symbol appears at the end of saved command sequences." />
                  <div className="text-sm font-medium">Ending symbols</div>
                  <div className="mt-2 space-y-2">
                    {analysis.endingCounts.length === 0 ? (
                      <div className="text-sm text-muted-foreground">None</div>
                    ) : (
                      analysis.endingCounts.map(({ symbol, count }) => (
                        <div key={symbol} className="flex items-center justify-between gap-3 text-sm">
                          <span className="font-mono">{symbol}</span>
                          <span className="text-muted-foreground">
                            {count} command{count === 1 ? "" : "s"}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="relative">
              <InfoTip
                className="right-3 top-3"
                content="Read the trie from the first symbol downward. Each row adds one symbol to the prefix, and each child is horizontally aligned under its parent span. Black nodes are unused prefixes with children; red nodes are duplicate populated sequences."
              />
              <CardHeader className="pr-14">
                <CardTitle>Trie Levels</CardTitle>
                <CardDescription>First symbol to deepest current prefix</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <div
                    className="space-y-3"
                    style={{
                      minWidth: `${3 + analysis.alignedTree.leafSlots * 5.5}rem`,
                    }}
                  >
                    {analysis.alignedTree.levels.map((level, depth) => {
                      if (depth === 0) return null;

                      return (
                        <div
                          key={depth}
                          className="grid gap-2"
                          style={{
                            gridTemplateColumns: `3rem repeat(${analysis.alignedTree.leafSlots}, minmax(5.5rem, 1fr))`,
                          }}
                        >
                          <div className="pt-2 text-xs font-medium text-muted-foreground">
                            L{depth}
                          </div>
                          {level.map(({ node, start, span }) => (
                            <div
                              key={`${node.depth}-${node.prefix || "root"}`}
                              style={{ gridColumn: `${start + 1} / span ${span}` }}
                            >
                              <NodeCell node={node} alphabet={analysis.alphabet} />
                            </div>
                          ))}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </main>

      <BottomNav />
    </div>
  );
}
