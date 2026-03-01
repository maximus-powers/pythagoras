/**
 * Dynamic unit generator for the training plan
 * Generates weekly goals based on current progress, mastery data, and settings
 * 
 * NEW STRUCTURE:
 * - T1 Sessions: Combined obedience, impulse control, and enrichment (replaces old T1, T4, T5)
 * - T2 Socialization: Weekly socialization items with aggressiveness scaling
 * - T3 Communication: Sound sequence pairing (vocabulary building)
 */

import {
  DevelopmentalInfo,
  getDevelopmentalInfo,
  getAggressivenessAdjustment,
  getTrainingWeekNumber,
} from "./age";
import {
  CommandMastery,
  calculateAllCommandMastery,
  AGGRESSIVENESS_THRESHOLDS,
} from "./mastery";
import { getWeeklySocializationBatch, assignItemsToWeeks } from "./socialization";
import {
  generateWeeklySessionSchedule,
  getTemplatesForPhase,
  getPhaseForWeek,
  SESSION_PARAMS_BY_PHASE,
  type SessionTemplate,
  type SessionObjective,
  type WeeklySessionSchedule,
} from "./sessions";
import type {
  Command,
  TrainingRecord,
  TrainingTrack,
  SocializationItem,
  SocializationScore,
  CompletedGoal,
  Milestone,
  TrainingSettings,
} from "@/lib/db/schema";

// Goal types - updated for session-based system
export type GoalType =
  | "session"             // Training session to complete
  | "session_activity"    // Individual activity within a session
  | "socialization_item"  // Socialization exposure
  | "exposure_count"      // Communication pairing (T3)
  | "milestone";          // Class/title/test milestone

export type GoalStatus = "pending" | "in_progress" | "completed" | "skipped";

// Updated track types - T1 is now Sessions, removed T4/T5
export type Track = "t1_sessions" | "t2_socialization" | "t3_communication";

export interface SessionGoal {
  id: string;
  track: "t1_sessions";
  goalType: "session";
  title: string;
  description: string;
  sessionType: string; // skill, impulse, play, enrichment, outing
  sessionId: string;
  objectives: SessionObjective[];
  activities: {
    name: string;
    description: string;
    durationMinutes: number;
    objectives: SessionObjective[];
    tips?: string[];
  }[];
  totalDuration: number;
  targetValue: { completed: number };
  currentValue: { completed: number };
  status: GoalStatus;
  sortOrder: number;
  dayOfWeek?: number; // 1-7, which day this session is recommended for
}

export interface SocializationGoal {
  id: string;
  track: "t2_socialization";
  goalType: "socialization_item";
  title: string;
  description: string;
  targetValue: { exposures: number; avgScore: number };
  currentValue: { exposures: number; avgScore: number; scores: number[] };
  status: GoalStatus;
  socializationItemId: string;
  sortOrder: number;
  isCarryOver?: boolean;
  originalWeek?: number;
}

export interface CommunicationGoal {
  id: string;
  track: "t3_communication";
  goalType: "exposure_count";
  title: string;
  description: string;
  sequence: string; // The sound sequence (e.g., "__..")
  discriminationSet: string; // Group ID for related sequences
  discriminationSetLabel: string; // Human-readable group name
  trainingContext?: string; // Context for same-sequence words (e.g., "recall" vs "name_focus")
  isFoundationMarker: boolean; // True for Yes/No markers
  targetValue: { count: number }; // 15 exposures for mastery
  currentValue: { count: number };
  status: GoalStatus;
  commandId: string;
  sortOrder: number; // Based on trainingOrder from command
}

// Union type for all goals
export type TrainingGoal = SessionGoal | SocializationGoal | CommunicationGoal;

export interface WeeklyUnit {
  weekNumber: number;
  startDate: Date;
  endDate: Date;
  dogAgeWeeks: number;
  developmentalInfo: DevelopmentalInfo;
  effectiveAggressiveness: number;
  isPreArrival: boolean;
  goals: TrainingGoal[];
  trackProgress: {
    track: Track;
    label: string;
    currentPhase: string;
    completedGoals: number;
    totalGoals: number;
  }[];
  sessionSchedule?: WeeklySessionSchedule; // New: full session schedule for the week
}

/**
 * Track labels for display
 */
const TRACK_LABELS: Record<Track, string> = {
  t1_sessions: "Sessions",
  t2_socialization: "Socialization",
  t3_communication: "Communication",
};

/**
 * Tier/Phase progression schedule based on training week
 */
type Tier = "tier_0" | "tier_a" | "tier_b" | "tier_c" | "tier_d";

function getProjectedTierForWeek(weekNumber: number): Tier {
  if (weekNumber <= 0) return "tier_0";
  if (weekNumber <= 8) return "tier_a";   // Weeks 1-8: Foundation (8-16 weeks old)
  if (weekNumber <= 16) return "tier_b";  // Weeks 9-16: Formal obedience (16-24 weeks old)
  if (weekNumber <= 36) return "tier_c";  // Weeks 17-36: Advanced (24-44 weeks old)
  return "tier_d";                         // Weeks 37+: Elite
}

/**
 * Generate a unique goal ID
 */
function generateGoalId(track: Track, type: GoalType, identifier: string): string {
  return `${track}_${type}_${identifier}`.toLowerCase().replace(/[^a-z0-9_]/g, "_");
}

/**
 * Check if a goal has been completed
 */
function isGoalCompleted(goalKey: string, completedGoals: CompletedGoal[]): boolean {
  return completedGoals.some((g) => g.goalKey === goalKey);
}

/**
 * Generate T1 (Sessions) goals - replaces old T1 obedience, T4 impulse, T5 enrichment
 * Each session is a goal that contains multiple activities
 */
function generateT1SessionGoals(
  weekNumber: number,
  aggressiveness: number,
  completedGoals: CompletedGoal[],
  isProjection: boolean = false
): SessionGoal[] {
  const goals: SessionGoal[] = [];
  const schedule = generateWeeklySessionSchedule(weekNumber, aggressiveness);
  let sortOrder = 0;
  
  // For projections, show a summary of sessions for each day
  // For current week, show all sessions as individual goals
  
  for (const dayPlan of schedule.dailyPlans) {
    for (let sessionIndex = 0; sessionIndex < dayPlan.sessions.length; sessionIndex++) {
      const session = dayPlan.sessions[sessionIndex];
      // Include session index to ensure uniqueness when same template appears multiple times per day
      const goalKey = generateGoalId(
        "t1_sessions", 
        "session", 
        `${session.id}_w${weekNumber}_d${dayPlan.day}_s${sessionIndex}`
      );
      
      const manuallyCompleted = !isProjection && isGoalCompleted(goalKey, completedGoals);
      
      goals.push({
        id: goalKey,
        track: "t1_sessions",
        goalType: "session",
        title: session.name,
        description: session.description,
        sessionType: session.type,
        sessionId: session.id,
        objectives: session.objectives,
        activities: session.activities,
        totalDuration: session.totalDuration,
        targetValue: { completed: 1 },
        currentValue: { completed: manuallyCompleted ? 1 : 0 },
        status: manuallyCompleted ? "completed" : "pending",
        sortOrder: sortOrder++,
        dayOfWeek: dayPlan.day,
      });
    }
  }
  
  return goals;
}

/**
 * Generate T2 (Socialization) goals using weekly batch system with aggressiveness scaling
 * - Each week has assigned items + carry-overs from previous weeks
 * - Items need 3+ exposures with avg score >= 4 to complete
 * - Number of items scales with aggressiveness setting
 */
function generateT2Goals(
  socializationItems: SocializationItem[],
  socializationScores: SocializationScore[],
  completedGoals: CompletedGoal[],
  weekNumber: number,
  weekStart: Date,
  weekEnd: Date,
  arrivalDate: Date,
  aggressiveness: number,
  isProjection: boolean = false
): SocializationGoal[] {
  const goals: SocializationGoal[] = [];
  let sortOrder = 0;
  
  // For projections, only show items assigned to this specific week (no carry-overs)
  if (isProjection) {
    const assignments = assignItemsToWeeks(socializationItems, 20, aggressiveness);
    const thisWeekItemIds = assignments.get(weekNumber) || [];
    const itemMap = new Map(socializationItems.map((i) => [i.id, i]));
    
    for (const itemId of thisWeekItemIds) {
      const item = itemMap.get(itemId);
      if (!item) continue;
      
      const goalKey = generateGoalId("t2_socialization", "socialization_item", `${item.id}_week_${weekNumber}`);
      
      goals.push({
        id: goalKey,
        track: "t2_socialization",
        goalType: "socialization_item",
        title: item.name,
        description: item.description || `Expose to ${item.name}`,
        targetValue: { exposures: 3, avgScore: 4 },
        currentValue: { exposures: 0, avgScore: 0, scores: [] },
        status: "pending",
        socializationItemId: item.id,
        sortOrder: sortOrder++,
      });
    }
    
    return goals;
  }
  
  // Get this week's batch (includes carry-overs and potential acceleration)
  const batch = getWeeklySocializationBatch(
    weekNumber,
    socializationItems,
    socializationScores,
    arrivalDate,
    weekStart,
    weekEnd,
    aggressiveness
  );
  
  // Add goals for each item in the batch
  for (const batchItem of batch.items) {
    const { item, weeklyScores, exposureCount, averageScore, isMastered, isCarryOver, originalWeek } = batchItem;
    
    const goalKey = generateGoalId("t2_socialization", "socialization_item", `${item.id}_week_${weekNumber}`);
    
    // Determine status
    let status: GoalStatus = "pending";
    if (isMastered) {
      status = "completed";
    } else if (exposureCount > 0) {
      status = "in_progress";
    }
    
    // Build description with requirements
    let description = item.description || `Expose to ${item.name}`;
    if (isCarryOver) {
      description += ` (carried from week ${originalWeek})`;
    }
    
    goals.push({
      id: goalKey,
      track: "t2_socialization",
      goalType: "socialization_item",
      title: item.name,
      description,
      targetValue: { 
        exposures: 3, 
        avgScore: 4,
      },
      currentValue: { 
        exposures: exposureCount,
        avgScore: Math.round(averageScore * 10) / 10,
        scores: weeklyScores,
      },
      status,
      socializationItemId: item.id,
      sortOrder: sortOrder++,
      isCarryOver,
      originalWeek: isCarryOver ? originalWeek : undefined,
    });
  }
  
  // Add accelerated item if applicable
  if (batch.acceleratedItem) {
    const { item, weeklyScores, exposureCount, averageScore, isMastered, originalWeek } = batch.acceleratedItem;
    
    const goalKey = generateGoalId("t2_socialization", "socialization_item", `${item.id}_week_${weekNumber}_accelerated`);
    
    let status: GoalStatus = "pending";
    if (isMastered) {
      status = "completed";
    } else if (exposureCount > 0) {
      status = "in_progress";
    }
    
    goals.push({
      id: goalKey,
      track: "t2_socialization",
      goalType: "socialization_item",
      title: `${item.name} (accelerated)`,
      description: `${item.description} - pulled from week ${originalWeek}`,
      targetValue: { 
        exposures: 3, 
        avgScore: 4,
      },
      currentValue: { 
        exposures: exposureCount,
        avgScore: Math.round(averageScore * 10) / 10,
        scores: weeklyScores,
      },
      status,
      socializationItemId: item.id,
      sortOrder: sortOrder++,
    });
  }
  
  return goals;
}

/**
 * Discrimination set labels for UI display
 */
const DISCRIMINATION_SET_LABELS: Record<string, string> = {
  foundation_markers: "Foundation Markers",
  foundation_commands: "Foundation Commands",
  identity: "Name Recognition",
  stationary: "Stationary Positions",
  movement_core: "Core Movement",
  movement_extended: "Movement Extensions",
  movement_advanced: "Advanced Movement",
  location: "Inside/Outside",
  bathroom: "Bathroom",
  sustenance: "Food & Water",
  inside_places: "Indoor Places",
  temporal: "Timing & Pace",
  modifiers: "Request Modifiers",
  vocal: "Vocal Commands",
  activities: "Activities",
  objects: "Objects",
  question: "Communication",
  feelings: "Emotional Signals",
  names: "Names",
};

/**
 * Calculate words per week based on week number and aggressiveness
 * - Weeks 1-2: Warm-up period (fewer words)
 * - Weeks 3+: Standard pacing
 */
function getWordsPerWeek(weekNumber: number, aggressiveness: number): number {
  const isWarmup = weekNumber <= 2;
  const baseCount = isWarmup ? 3 : 5;
  const adjustment = aggressiveness - 3; // -2 to +2
  return Math.max(2, Math.min(8, baseCount + adjustment));
}

/**
 * Calculate cumulative words to include by week number
 * This determines how many words from the training order should be active
 */
function getCumulativeWordsForWeek(weekNumber: number, aggressiveness: number): number {
  let total = 0;
  for (let w = 1; w <= weekNumber; w++) {
    total += getWordsPerWeek(w, aggressiveness);
  }
  // Add 4 for Tier 0 foundation words (always active)
  return total + 4;
}

/**
 * Generate T3 (Communication) goals - sequence exposure and comprehension
 * 
 * Training approach:
 * - Foundation markers (Yes/No) shown as ongoing, always reinforced
 * - Foundation commands (Driving/Release) trained with 15 exposure target
 * - All other words trained with 15 exposure target
 * - Words grouped by discrimination set for visual organization
 * - Pacing: 4-5 words per week (scaled by aggressiveness), warm-up for weeks 1-2
 */
function generateT3Goals(
  commands: Command[],
  trackProgress: TrainingTrack,
  completedGoals: CompletedGoal[],
  weekNumber: number = 1,
  aggressiveness: number = 3,
  isProjection: boolean = false
): CommunicationGoal[] {
  const goals: CommunicationGoal[] = [];
  
  // Sort commands by training order
  const sortedCommands = [...commands]
    .filter((c) => c.trainingOrder != null)
    .sort((a, b) => (a.trainingOrder || 0) - (b.trainingOrder || 0));
  
  // Calculate how many words should be active for this week
  const cumulativeWords = getCumulativeWordsForWeek(weekNumber, aggressiveness);
  
  // Get commands that should be active (up to cumulative count)
  const activeCommands = sortedCommands.slice(0, cumulativeWords);
  
  // Target exposure count for mastery
  const TARGET_EXPOSURES = 15;
  
  for (const cmd of activeCommands) {
    const goalKey = isProjection
      ? generateGoalId("t3_communication", "exposure_count", `${cmd.id}_${TARGET_EXPOSURES}_w${weekNumber}`)
      : generateGoalId("t3_communication", "exposure_count", `${cmd.id}_${TARGET_EXPOSURES}`);
    
    const manuallyCompleted = !isProjection && isGoalCompleted(goalKey, completedGoals);
    const currentCount = cmd.exposureCount || 0;
    const isFoundationMarker = cmd.isFoundationMarker || false;
    
    // Foundation markers (Yes/No) are "always in progress" - never complete
    // Other words complete at 15 exposures
    let status: GoalStatus;
    if (isFoundationMarker) {
      status = "in_progress"; // Always ongoing
    } else if (manuallyCompleted || currentCount >= TARGET_EXPOSURES) {
      status = "completed";
    } else if (currentCount > 0) {
      status = "in_progress";
    } else {
      status = "pending";
    }
    
    // Build description
    let description: string;
    if (isFoundationMarker) {
      description = cmd.word === "Yes" 
        ? "Primary reward marker - pair with treats constantly"
        : "Reset marker - signals 'try again'";
    } else {
      description = `Pair sound sequence with ${cmd.description?.toLowerCase() || "action/object"}`;
    }
    
    goals.push({
      id: goalKey,
      track: "t3_communication",
      goalType: "exposure_count",
      title: cmd.word,
      description,
      sequence: cmd.sequence,
      discriminationSet: cmd.discriminationSet || "other",
      discriminationSetLabel: DISCRIMINATION_SET_LABELS[cmd.discriminationSet || "other"] || "Other",
      trainingContext: cmd.trainingContext || undefined,
      isFoundationMarker,
      targetValue: { count: isFoundationMarker ? Infinity : TARGET_EXPOSURES },
      currentValue: { count: currentCount },
      status,
      commandId: cmd.id,
      sortOrder: cmd.trainingOrder || 0,
    });
  }
  
  return goals;
}

/**
 * Generate the complete weekly training unit
 * @param isProjection - If true, this is a future week projection (show projected goals, not current data)
 */
export function generateWeeklyUnit(
  birthDate: Date,
  arrivalDate: Date,
  settings: TrainingSettings,
  tracks: TrainingTrack[],
  commands: Command[],
  records: TrainingRecord[],
  socializationItems: SocializationItem[],
  socializationScores: SocializationScore[],
  completedGoals: CompletedGoal[],
  milestones: Milestone[],
  asOf: Date = new Date(),
  isProjection: boolean = false
): WeeklyUnit {
  const developmentalInfo = getDevelopmentalInfo(birthDate, arrivalDate, asOf);
  const weekNumber = getTrainingWeekNumber(arrivalDate, asOf);
  
  // Calculate week boundaries
  const startDate = new Date(asOf);
  startDate.setDate(startDate.getDate() - startDate.getDay()); // Start of week (Sunday)
  const endDate = new Date(startDate);
  endDate.setDate(endDate.getDate() + 6);
  
  // Handle pre-arrival
  if (!developmentalInfo.isArrived) {
    return {
      weekNumber: 0,
      startDate,
      endDate,
      dogAgeWeeks: developmentalInfo.ageWeeks,
      developmentalInfo,
      effectiveAggressiveness: settings.aggressiveness,
      isPreArrival: true,
      goals: [],
      trackProgress: [],
    };
  }
  
  // Adjust aggressiveness for fear periods
  const effectiveAggressiveness = getAggressivenessAdjustment(
    developmentalInfo.fearPeriod,
    settings.aggressiveness
  );
  
  // Generate session schedule for reference
  const sessionSchedule = generateWeeklySessionSchedule(weekNumber, effectiveAggressiveness);
  
  // Generate goals for each track
  const allGoals: TrainingGoal[] = [];
  
  // Find track progress records
  const getTrackProgress = (track: Track): TrainingTrack => {
    // Map new track names to old ones for backward compatibility
    const trackMap: Record<Track, string> = {
      t1_sessions: "t1_obedience",
      t2_socialization: "t2_socialization", 
      t3_communication: "t3_communication",
    };
    const oldTrackName = trackMap[track];
    return tracks.find((t) => t.track === oldTrackName) || {
      id: "",
      track: oldTrackName as "t1_obedience" | "t2_socialization" | "t3_communication" | "t4_impulse" | "t5_enrichment",
      currentTier: "tier_0",
      currentPhase: getPhaseForWeek(weekNumber),
      offLeashRung: 1,
      updatedAt: new Date(),
    };
  };
  
  // T1: Sessions (combines old obedience, impulse, enrichment)
  allGoals.push(
    ...generateT1SessionGoals(weekNumber, effectiveAggressiveness, completedGoals, isProjection)
  );
  
  // T2: Socialization (using weekly batch system with aggressiveness scaling)
  allGoals.push(
    ...generateT2Goals(
      socializationItems, 
      socializationScores, 
      completedGoals,
      weekNumber,
      startDate,
      endDate,
      arrivalDate,
      effectiveAggressiveness,
      isProjection
    )
  );
  
  // T3: Communication
  const t3Progress = getTrackProgress("t3_communication");
  allGoals.push(...generateT3Goals(commands, t3Progress, completedGoals, weekNumber, effectiveAggressiveness, isProjection));
  
  // Calculate track progress summaries
  const trackProgress = (["t1_sessions", "t2_socialization", "t3_communication"] as Track[]).map((track) => {
    const trackGoals = allGoals.filter((g) => g.track === track);
    const completed = trackGoals.filter((g) => g.status === "completed").length;
    const tp = getTrackProgress(track);
    
    return {
      track,
      label: TRACK_LABELS[track],
      currentPhase: tp.currentPhase || getPhaseForWeek(weekNumber),
      completedGoals: completed,
      totalGoals: trackGoals.length,
    };
  });
  
  return {
    weekNumber,
    startDate,
    endDate,
    dogAgeWeeks: developmentalInfo.ageWeeks,
    developmentalInfo,
    effectiveAggressiveness,
    isPreArrival: false,
    goals: allGoals,
    trackProgress,
    sessionSchedule,
  };
}

/**
 * Get a pre-arrival placeholder unit
 */
export function getPreArrivalUnit(
  birthDate: Date,
  arrivalDate: Date,
  asOf: Date = new Date()
): WeeklyUnit {
  const developmentalInfo = getDevelopmentalInfo(birthDate, arrivalDate, asOf);
  
  return {
    weekNumber: 0,
    startDate: asOf,
    endDate: asOf,
    dogAgeWeeks: developmentalInfo.ageWeeks,
    developmentalInfo,
    effectiveAggressiveness: 3,
    isPreArrival: true,
    goals: [],
    trackProgress: [],
  };
}
