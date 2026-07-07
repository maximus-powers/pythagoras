import type { Command } from "@/lib/db/schema";

export type SequenceSymbol = string;

export const DIRECT_PREFIX_GROUP_KEY = "_direct_";

export interface CommandPrefixGroup {
  key: string;
  prefix: string;
  depth: number;
  isDirect: boolean;
  commands: Command[];
}

export interface CommandParentPrefixGroup {
  key: string;
  prefix: string;
  depth: number;
  commands: Command[];
  childGroups: CommandPrefixGroup[];
}

export function parseSequence(sequence: string): SequenceSymbol[] {
  return Array.from(sequence);
}

export function getObservedAlphabet(commands: Command[]): SequenceSymbol[] {
  const symbols = new Set<SequenceSymbol>();

  for (const command of commands) {
    for (const symbol of parseSequence(command.sequence)) {
      symbols.add(symbol);
    }
  }

  return Array.from(symbols).sort((a, b) => a.localeCompare(b));
}

function makeAlphabetIndex(alphabet: SequenceSymbol[]) {
  return new Map(alphabet.map((symbol, index) => [symbol, index]));
}

export function compareSequencesByTree(
  a: string,
  b: string,
  alphabet: SequenceSymbol[]
): number {
  const alphabetIndex = makeAlphabetIndex(alphabet);
  const aSymbols = parseSequence(a);
  const bSymbols = parseSequence(b);
  const limit = Math.min(aSymbols.length, bSymbols.length);

  for (let index = 0; index < limit; index += 1) {
    const aSymbol = aSymbols[index];
    const bSymbol = bSymbols[index];

    if (aSymbol !== bSymbol) {
      const aOrder = alphabetIndex.get(aSymbol);
      const bOrder = alphabetIndex.get(bSymbol);

      if (aOrder != null && bOrder != null) {
        return aOrder - bOrder;
      }

      return aSymbol.localeCompare(bSymbol);
    }
  }

  return aSymbols.length - bSymbols.length;
}

export function sortCommandsByTree(commands: Command[], alphabet = getObservedAlphabet(commands)) {
  return [...commands].sort((a, b) => {
    const sequenceOrder = compareSequencesByTree(a.sequence, b.sequence, alphabet);
    if (sequenceOrder !== 0) return sequenceOrder;

    return a.word.localeCompare(b.word);
  });
}

export function getCommonSequencePrefix(sequences: string[]): string {
  if (sequences.length === 0) return "";
  if (sequences.length === 1) return sequences[0];

  let prefix = "";
  const first = parseSequence(sequences[0]);

  for (let index = 0; index < first.length; index += 1) {
    const symbol = first[index];
    const matchesAll = sequences.every((sequence) => parseSequence(sequence)[index] === symbol);

    if (!matchesAll) break;
    prefix += symbol;
  }

  return prefix;
}

function getPrefixAtDepth(sequence: string, depth: number): string {
  return parseSequence(sequence).slice(0, depth).join("");
}

export function groupCommandsByTree(commands: Command[]) {
  const alphabet = getObservedAlphabet(commands);
  const sortedCommands = sortCommandsByTree(commands, alphabet);
  const parentGroups = new Map<string, CommandParentPrefixGroup>();

  for (const command of sortedCommands) {
    const parentPrefix = getPrefixAtDepth(command.sequence, 1);
    const parentKey = parentPrefix || "root";
    let parentGroup = parentGroups.get(parentKey);

    if (!parentGroup) {
      parentGroup = {
        key: parentKey,
        prefix: parentPrefix,
        depth: parentPrefix ? 1 : 0,
        commands: [],
        childGroups: [],
      };
      parentGroups.set(parentKey, parentGroup);
    }

    parentGroup.commands.push(command);

    const symbols = parseSequence(command.sequence);
    const isDirect = symbols.length <= 1;
    const childPrefix = isDirect ? parentPrefix : getPrefixAtDepth(command.sequence, 2);
    const childKey = isDirect ? `${parentKey}:${DIRECT_PREFIX_GROUP_KEY}` : childPrefix;
    let childGroup = parentGroup.childGroups.find((group) => group.key === childKey);

    if (!childGroup) {
      childGroup = {
        key: childKey,
        prefix: childPrefix,
        depth: isDirect ? parentGroup.depth : 2,
        isDirect,
        commands: [],
      };
      parentGroup.childGroups.push(childGroup);
    }

    childGroup.commands.push(command);
  }

  return {
    alphabet,
    sortedCommands,
    groups: Array.from(parentGroups.values()),
  };
}
