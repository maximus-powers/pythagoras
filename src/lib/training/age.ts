/**
 * Age calculations, developmental stages, and fear period detection
 * for the training plan system.
 */

export type DevelopmentalStage =
  | "pre_arrival"
  | "socialization_fear_1"
  | "peak_socialization"
  | "socialization_closing"
  | "juvenile"
  | "early_adolescence"
  | "adolescence_fear_2"
  | "late_adolescence"
  | "approaching_maturity"
  | "mature";

export interface FearPeriodStatus {
  active: boolean;
  period: 1 | 2 | null;
  description: string;
}

export interface DevelopmentalInfo {
  ageWeeks: number;
  ageDays: number;
  stage: DevelopmentalStage;
  stageLabel: string;
  stageDescription: string;
  fearPeriod: FearPeriodStatus;
  socializationWindow: "peak" | "closing" | "closed";
  daysUntilArrival: number | null;
  isArrived: boolean;
}

/**
 * Calculate age in weeks from birth date
 */
export function getDogAgeWeeks(birthDate: Date, asOf: Date = new Date()): number {
  const diffMs = asOf.getTime() - birthDate.getTime();
  const diffDays = diffMs / (1000 * 60 * 60 * 24);
  return Math.floor(diffDays / 7);
}

/**
 * Calculate age in days from birth date
 */
export function getDogAgeDays(birthDate: Date, asOf: Date = new Date()): number {
  const diffMs = asOf.getTime() - birthDate.getTime();
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}

/**
 * Calculate days until arrival
 */
export function getDaysUntilArrival(arrivalDate: Date, asOf: Date = new Date()): number {
  const diffMs = arrivalDate.getTime() - asOf.getTime();
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
}

/**
 * Check if dog has arrived
 */
export function hasArrived(arrivalDate: Date, asOf: Date = new Date()): boolean {
  return asOf >= arrivalDate;
}

/**
 * Determine developmental stage based on age in weeks
 * Based on Scott & Fuller's critical periods and herding breed research
 */
export function getDevelopmentalStage(ageWeeks: number, isArrived: boolean): DevelopmentalStage {
  if (!isArrived) return "pre_arrival";
  
  if (ageWeeks < 8) return "pre_arrival"; // Shouldn't happen, but handle it
  if (ageWeeks >= 8 && ageWeeks < 11) return "socialization_fear_1";
  if (ageWeeks >= 10 && ageWeeks < 13) return "peak_socialization";
  if (ageWeeks >= 13 && ageWeeks < 16) return "socialization_closing";
  if (ageWeeks >= 16 && ageWeeks < 24) return "juvenile";
  if (ageWeeks >= 24 && ageWeeks < 32) return "early_adolescence";
  if (ageWeeks >= 32 && ageWeeks < 56) return "adolescence_fear_2";
  if (ageWeeks >= 56 && ageWeeks < 72) return "late_adolescence";
  if (ageWeeks >= 72 && ageWeeks < 104) return "approaching_maturity";
  return "mature";
}

/**
 * Get human-readable label for developmental stage
 */
export function getStageLabel(stage: DevelopmentalStage): string {
  const labels: Record<DevelopmentalStage, string> = {
    pre_arrival: "Pre-Arrival",
    socialization_fear_1: "Socialization + Fear Period 1",
    peak_socialization: "Peak Socialization",
    socialization_closing: "Socialization Closing",
    juvenile: "Juvenile",
    early_adolescence: "Early Adolescence",
    adolescence_fear_2: "Adolescence + Fear Period 2",
    late_adolescence: "Late Adolescence",
    approaching_maturity: "Approaching Maturity",
    mature: "Mature",
  };
  return labels[stage];
}

/**
 * Get description for developmental stage
 */
export function getStageDescription(stage: DevelopmentalStage): string {
  const descriptions: Record<DevelopmentalStage, string> = {
    pre_arrival: "Preparing for puppy's arrival",
    socialization_fear_1: "Critical socialization window with first fear period (8-11 weeks). Prioritize positive exposures, avoid flooding.",
    peak_socialization: "Maximum exposure window (10-12 weeks). This is the best time for new experiences.",
    socialization_closing: "Socialization window narrowing (14-16 weeks). Complete remaining checklist items.",
    juvenile: "Formal training begins. Building foundation skills and proofing behaviors.",
    early_adolescence: "Independence emerging. Watch for regression signs indicating fear period.",
    adolescence_fear_2: "Second fear period possible (6-14 months). Expect some regression, reduce pressure.",
    late_adolescence: "Maturing behavior. Proofing skills in real-world environments.",
    approaching_maturity: "Near adult behavior. Competition prep and advanced training.",
    mature: "Adult dog. Maintenance and continued enrichment.",
  };
  return descriptions[stage];
}

/**
 * Check if currently in a fear period
 * First fear period: 8-11 weeks
 * Second fear period: 6-14 months (24-56 weeks) - episodic
 */
export function getFearPeriodStatus(ageWeeks: number): FearPeriodStatus {
  // First fear period: 8-11 weeks
  if (ageWeeks >= 8 && ageWeeks < 11) {
    return {
      active: true,
      period: 1,
      description: "First fear period (8-11 weeks). Avoid flooding, reduce intensity, prioritize positive experiences.",
    };
  }
  
  // Second fear period: 6-14 months (24-56 weeks) - episodic
  // We flag the entire window but note it's episodic
  if (ageWeeks >= 24 && ageWeeks < 56) {
    return {
      active: true,
      period: 2,
      description: "Second fear period window (6-14 months). May be episodic. Watch for sudden fearfulness, reduce pressure if observed.",
    };
  }
  
  return {
    active: false,
    period: null,
    description: "No fear period active.",
  };
}

/**
 * Get socialization window status
 */
export function getSocializationWindowStatus(ageWeeks: number): "peak" | "closing" | "closed" {
  if (ageWeeks >= 8 && ageWeeks < 12) return "peak";
  if (ageWeeks >= 12 && ageWeeks < 16) return "closing";
  return "closed";
}

/**
 * Get comprehensive developmental info for a dog
 */
export function getDevelopmentalInfo(
  birthDate: Date,
  arrivalDate: Date,
  asOf: Date = new Date()
): DevelopmentalInfo {
  const ageWeeks = getDogAgeWeeks(birthDate, asOf);
  const ageDays = getDogAgeDays(birthDate, asOf);
  const isArrived = hasArrived(arrivalDate, asOf);
  const daysUntilArrival = isArrived ? null : getDaysUntilArrival(arrivalDate, asOf);
  
  const stage = getDevelopmentalStage(ageWeeks, isArrived);
  const fearPeriod = getFearPeriodStatus(ageWeeks);
  const socializationWindow = getSocializationWindowStatus(ageWeeks);
  
  return {
    ageWeeks,
    ageDays,
    stage,
    stageLabel: getStageLabel(stage),
    stageDescription: getStageDescription(stage),
    fearPeriod,
    socializationWindow,
    daysUntilArrival,
    isArrived,
  };
}

/**
 * Get the current week number of training (1-indexed from arrival)
 */
export function getTrainingWeekNumber(arrivalDate: Date, asOf: Date = new Date()): number {
  if (!hasArrived(arrivalDate, asOf)) return 0;
  
  const diffMs = asOf.getTime() - arrivalDate.getTime();
  const diffDays = diffMs / (1000 * 60 * 60 * 24);
  return Math.floor(diffDays / 7) + 1; // 1-indexed
}

/**
 * Format age as human-readable string
 */
export function formatAge(ageWeeks: number): string {
  if (ageWeeks < 1) return "< 1 week old";
  if (ageWeeks === 1) return "1 week old";
  if (ageWeeks < 52) return `${ageWeeks} weeks old`;
  
  const months = Math.floor(ageWeeks / 4.33);
  if (months < 24) return `${months} months old`;
  
  const years = Math.floor(months / 12);
  const remainingMonths = months % 12;
  if (remainingMonths === 0) return `${years} year${years > 1 ? 's' : ''} old`;
  return `${years} year${years > 1 ? 's' : ''}, ${remainingMonths} month${remainingMonths > 1 ? 's' : ''} old`;
}

/**
 * Get aggressiveness adjustment for fear periods
 * Returns the maximum aggressiveness level that should be used
 */
export function getAggressivenessAdjustment(fearPeriod: FearPeriodStatus, currentAggressiveness: number): number {
  if (fearPeriod.active) {
    // During fear periods, cap aggressiveness at 2
    return Math.min(currentAggressiveness, 2);
  }
  return currentAggressiveness;
}
