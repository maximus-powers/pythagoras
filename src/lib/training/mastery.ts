/**
 * Mastery calculations from training records
 * Provides per-command accuracy, latency, and tier readiness checks
 */

import { TrainingRecord, Command } from "@/lib/db/schema";

export interface CommandMastery {
  commandId: string;
  word: string;
  sequence: string;
  tier: string;
  totalAttempts: number;
  positiveCount: number;
  negativeCount: number;
  accuracy: number; // 0-100
  averageLatencyMs: number | null;
  medianLatencyMs: number | null;
  p90LatencyMs: number | null;
  lastAttemptAt: Date | null;
  sessionsWithAttempts: number;
}

export interface TierReadiness {
  tier: string;
  ready: boolean;
  commands: {
    commandId: string;
    word: string;
    accuracy: number;
    meetsThreshold: boolean;
    sessionsWithAttempts: number;
  }[];
  overallAccuracy: number;
  blockingCommands: string[]; // command IDs that don't meet threshold
}

export interface ConfusionMatrixEntry {
  commandId: string;
  word: string;
  confusedWith: {
    commandId: string;
    word: string;
    count: number;
    rate: number; // 0-1
  }[];
}

/**
 * Aggressiveness level thresholds
 */
export const AGGRESSIVENESS_THRESHOLDS: Record<number, { accuracy: number; minSessions: number }> = {
  1: { accuracy: 95, minSessions: 5 }, // Relaxed
  2: { accuracy: 90, minSessions: 4 }, // Moderate
  3: { accuracy: 85, minSessions: 3 }, // Standard
  4: { accuracy: 80, minSessions: 2 }, // Accelerated
  5: { accuracy: 80, minSessions: 2 }, // Elite (same threshold, but in novel environments)
};

/**
 * Calculate mastery for a single command based on training records
 */
export function calculateCommandMastery(
  command: Command,
  records: TrainingRecord[],
  windowDays: number = 30
): CommandMastery {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - windowDays);
  
  // Filter records for this command within the window
  const relevantRecords = records.filter(
    (r) => r.commandId === command.id && new Date(r.createdAt) >= cutoffDate
  );
  
  const positiveCount = relevantRecords.filter((r) => r.result === "positive").length;
  const negativeCount = relevantRecords.filter((r) => r.result === "negative").length;
  const totalAttempts = positiveCount + negativeCount;
  
  // Calculate accuracy
  const accuracy = totalAttempts > 0 ? (positiveCount / totalAttempts) * 100 : 0;
  
  // Calculate latency stats from positive responses
  const latencies = relevantRecords
    .filter((r) => r.result === "positive" && r.responseTimeMs !== null)
    .map((r) => r.responseTimeMs!)
    .sort((a, b) => a - b);
  
  let averageLatencyMs: number | null = null;
  let medianLatencyMs: number | null = null;
  let p90LatencyMs: number | null = null;
  
  if (latencies.length > 0) {
    averageLatencyMs = latencies.reduce((a, b) => a + b, 0) / latencies.length;
    medianLatencyMs = latencies[Math.floor(latencies.length / 2)];
    p90LatencyMs = latencies[Math.floor(latencies.length * 0.9)];
  }
  
  // Count unique sessions
  const uniqueSessions = new Set(
    relevantRecords.filter((r) => r.sessionId).map((r) => r.sessionId)
  );
  
  // Find last attempt
  const lastRecord = relevantRecords.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  )[0];
  
  return {
    commandId: command.id,
    word: command.word,
    sequence: command.sequence,
    tier: command.tier || "tier_a",
    totalAttempts,
    positiveCount,
    negativeCount,
    accuracy,
    averageLatencyMs,
    medianLatencyMs,
    p90LatencyMs,
    lastAttemptAt: lastRecord ? new Date(lastRecord.createdAt) : null,
    sessionsWithAttempts: uniqueSessions.size,
  };
}

/**
 * Calculate mastery for all commands
 */
export function calculateAllCommandMastery(
  commands: Command[],
  records: TrainingRecord[],
  windowDays: number = 30
): Map<string, CommandMastery> {
  const masteryMap = new Map<string, CommandMastery>();
  
  for (const command of commands) {
    masteryMap.set(command.id, calculateCommandMastery(command, records, windowDays));
  }
  
  return masteryMap;
}

/**
 * Check if a command meets the mastery threshold for a given aggressiveness level
 */
export function meetsThreshold(
  mastery: CommandMastery,
  aggressiveness: number
): boolean {
  const threshold = AGGRESSIVENESS_THRESHOLDS[aggressiveness] || AGGRESSIVENESS_THRESHOLDS[3];
  
  return (
    mastery.accuracy >= threshold.accuracy &&
    mastery.sessionsWithAttempts >= threshold.minSessions
  );
}

/**
 * Check tier readiness - whether all commands in a tier meet mastery thresholds
 */
export function checkTierReadiness(
  tier: string,
  commands: Command[],
  records: TrainingRecord[],
  aggressiveness: number,
  windowDays: number = 30
): TierReadiness {
  const tierCommands = commands.filter((c) => c.tier === tier);
  const threshold = AGGRESSIVENESS_THRESHOLDS[aggressiveness] || AGGRESSIVENESS_THRESHOLDS[3];
  
  const commandStatus = tierCommands.map((cmd) => {
    const mastery = calculateCommandMastery(cmd, records, windowDays);
    const meets = meetsThreshold(mastery, aggressiveness);
    
    return {
      commandId: cmd.id,
      word: cmd.word,
      accuracy: mastery.accuracy,
      meetsThreshold: meets,
      sessionsWithAttempts: mastery.sessionsWithAttempts,
    };
  });
  
  const blockingCommands = commandStatus
    .filter((c) => !c.meetsThreshold)
    .map((c) => c.commandId);
  
  const totalAccuracy = commandStatus.length > 0
    ? commandStatus.reduce((sum, c) => sum + c.accuracy, 0) / commandStatus.length
    : 0;
  
  return {
    tier,
    ready: blockingCommands.length === 0 && tierCommands.length > 0,
    commands: commandStatus,
    overallAccuracy: totalAccuracy,
    blockingCommands,
  };
}

/**
 * Get commands that need work (below threshold or few attempts)
 */
export function getCommandsNeedingWork(
  commands: Command[],
  records: TrainingRecord[],
  aggressiveness: number,
  limit: number = 5,
  windowDays: number = 30
): CommandMastery[] {
  const threshold = AGGRESSIVENESS_THRESHOLDS[aggressiveness] || AGGRESSIVENESS_THRESHOLDS[3];
  
  const masteryList = commands.map((cmd) =>
    calculateCommandMastery(cmd, records, windowDays)
  );
  
  // Sort by: lowest accuracy first, then by fewest sessions
  return masteryList
    .filter((m) => m.totalAttempts > 0) // Only commands that have been attempted
    .filter((m) => !meetsThreshold(m, aggressiveness))
    .sort((a, b) => {
      // Primary: accuracy (lower = needs more work)
      if (a.accuracy !== b.accuracy) return a.accuracy - b.accuracy;
      // Secondary: sessions (fewer = needs more work)
      return a.sessionsWithAttempts - b.sessionsWithAttempts;
    })
    .slice(0, limit);
}

/**
 * Get commands ready for advancement (high accuracy, many sessions)
 */
export function getCommandsReadyForAdvancement(
  commands: Command[],
  records: TrainingRecord[],
  aggressiveness: number,
  windowDays: number = 30
): CommandMastery[] {
  return commands
    .map((cmd) => calculateCommandMastery(cmd, records, windowDays))
    .filter((m) => meetsThreshold(m, aggressiveness));
}

/**
 * Calculate confusion matrix - which sequences get confused with each other
 * This requires additional data about which command was intended vs what was marked
 * For now, we'll use proximity in time to infer confusion
 */
export function calculateConfusionMatrix(
  commands: Command[],
  records: TrainingRecord[],
  windowDays: number = 30
): ConfusionMatrixEntry[] {
  // Note: Full confusion matrix would require tracking "intended" vs "executed"
  // For now, we'll return a simplified version based on commands with high error rates
  // that have similar sequences (suggesting possible confusion)
  
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - windowDays);
  
  const entries: ConfusionMatrixEntry[] = [];
  
  for (const command of commands) {
    const relevantRecords = records.filter(
      (r) => r.commandId === command.id && new Date(r.createdAt) >= cutoffDate
    );
    
    const negativeCount = relevantRecords.filter((r) => r.result === "negative").length;
    
    if (negativeCount > 0) {
      // Find commands with similar sequences that might be confused
      const similarCommands = commands
        .filter((c) => c.id !== command.id)
        .filter((c) => {
          // Check if sequences share a prefix or are similar
          const minLen = Math.min(command.sequence.length, c.sequence.length);
          const sharedPrefix = command.sequence.slice(0, minLen) === c.sequence.slice(0, minLen);
          const lengthDiff = Math.abs(command.sequence.length - c.sequence.length);
          return sharedPrefix || lengthDiff <= 1;
        })
        .map((c) => ({
          commandId: c.id,
          word: c.word,
          count: negativeCount, // Simplified - actual count would need more tracking
          rate: negativeCount / Math.max(relevantRecords.length, 1),
        }))
        .filter((c) => c.rate > 0.15); // Only flag if >15% confusion rate
      
      if (similarCommands.length > 0) {
        entries.push({
          commandId: command.id,
          word: command.word,
          confusedWith: similarCommands,
        });
      }
    }
  }
  
  return entries;
}

/**
 * Get overall training statistics
 */
export function getOverallStats(
  commands: Command[],
  records: TrainingRecord[],
  windowDays: number = 30
): {
  totalCommands: number;
  commandsAttempted: number;
  totalAttempts: number;
  overallAccuracy: number;
  averageLatencyMs: number | null;
  mostPracticedCommands: { word: string; attempts: number }[];
  leastPracticedCommands: { word: string; attempts: number }[];
} {
  const masteryList = commands.map((cmd) =>
    calculateCommandMastery(cmd, records, windowDays)
  );
  
  const commandsAttempted = masteryList.filter((m) => m.totalAttempts > 0).length;
  const totalAttempts = masteryList.reduce((sum, m) => sum + m.totalAttempts, 0);
  const totalPositive = masteryList.reduce((sum, m) => sum + m.positiveCount, 0);
  
  const overallAccuracy = totalAttempts > 0 ? (totalPositive / totalAttempts) * 100 : 0;
  
  // Calculate average latency across all commands
  const latencies = masteryList
    .filter((m) => m.averageLatencyMs !== null)
    .map((m) => m.averageLatencyMs!);
  const averageLatencyMs = latencies.length > 0
    ? latencies.reduce((a, b) => a + b, 0) / latencies.length
    : null;
  
  // Most and least practiced
  const sortedByAttempts = [...masteryList].sort((a, b) => b.totalAttempts - a.totalAttempts);
  
  return {
    totalCommands: commands.length,
    commandsAttempted,
    totalAttempts,
    overallAccuracy,
    averageLatencyMs,
    mostPracticedCommands: sortedByAttempts
      .slice(0, 5)
      .filter((m) => m.totalAttempts > 0)
      .map((m) => ({ word: m.word, attempts: m.totalAttempts })),
    leastPracticedCommands: sortedByAttempts
      .slice(-5)
      .reverse()
      .filter((m) => m.totalAttempts > 0)
      .map((m) => ({ word: m.word, attempts: m.totalAttempts })),
  };
}
