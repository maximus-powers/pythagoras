/**
 * Weekly socialization batch management
 * 
 * - Each week gets a batch of 5-7 items based on developmental stage
 * - Items can be scored multiple times per week (need 3+ exposures)
 * - Need avg score ≥4 to complete, otherwise carries over
 * - If all items hit avg 5 with 3+ exposures, accelerate one from next week
 */

import type { SocializationItem, SocializationScore } from "@/lib/db/schema";

/**
 * Base items per week based on developmental stage
 * These are the baseline values before aggressiveness scaling
 */
function getBaseItemsPerWeek(weekNumber: number): number {
  if (weekNumber <= 4) return 8;  // Weeks 1-4: Peak critical period (8-12 weeks old)
  if (weekNumber <= 8) return 6;  // Weeks 5-8: Still critical (12-16 weeks old)
  if (weekNumber <= 12) return 4; // Weeks 9-12: Window closing (16-20 weeks old)
  if (weekNumber <= 16) return 3; // Weeks 13-16: Late window (20-24 weeks old)
  return 2; // Weeks 17+: Maintenance mode
}

/**
 * Scale items per week based on aggressiveness setting
 * Aggressiveness 1-5 maps to 60%-140% of base count
 * 
 * @param weekNumber - Training week number
 * @param aggressiveness - 1-5 setting (default 3)
 * @returns Number of items for this week
 */
export function getItemsPerWeek(weekNumber: number, aggressiveness: number = 3): number {
  const baseCount = getBaseItemsPerWeek(weekNumber);
  
  // Scale factor: agg 1 = 60%, agg 2 = 80%, agg 3 = 100%, agg 4 = 120%, agg 5 = 140%
  const scaleFactor = 0.6 + (aggressiveness - 1) * 0.2;
  const scaledCount = Math.round(baseCount * scaleFactor);
  
  // Minimum 1 item, maximum 12 items per week
  return Math.max(1, Math.min(12, scaledCount));
}

/**
 * Legacy function for age-based calculation (backward compatibility)
 * @deprecated Use getItemsPerWeek(weekNumber, aggressiveness) instead
 */
export function getItemsPerWeekByAge(ageWeeks: number): number {
  if (ageWeeks >= 8 && ageWeeks < 12) return 7; // Peak socialization
  if (ageWeeks >= 12 && ageWeeks < 16) return 5; // Closing window
  return 3; // Maintenance mode
}

// Priority order for categories during socialization
const CATEGORY_PRIORITY: Record<string, number> = {
  handling: 1,    // Most critical - daily handling
  people: 2,      // Very important
  sounds: 3,      // Important early
  environments: 4,
  surfaces: 5,
  animals: 6,
  objects: 7,
};

/**
 * Calculate weekly scores for an item within a date range
 */
export function getWeeklyScores(
  itemId: string,
  scores: SocializationScore[],
  weekStart: Date,
  weekEnd: Date
): number[] {
  return scores
    .filter((s) => {
      const scoredAt = new Date(s.scoredAt);
      return s.itemId === itemId && scoredAt >= weekStart && scoredAt <= weekEnd;
    })
    .map((s) => s.score);
}

/**
 * Calculate average score for an item this week
 */
export function getWeeklyAverage(weeklyScores: number[]): number {
  if (weeklyScores.length === 0) return 0;
  return weeklyScores.reduce((a, b) => a + b, 0) / weeklyScores.length;
}

/**
 * Check if an item is mastered this week (avg >= 4 with 3+ exposures)
 */
export function isItemMasteredThisWeek(weeklyScores: number[]): boolean {
  return weeklyScores.length >= 3 && getWeeklyAverage(weeklyScores) >= 4;
}

/**
 * Check if an item is "excellently" mastered (avg = 5 with 3+ exposures)
 * Used for acceleration logic
 */
export function isItemExcellent(weeklyScores: number[]): boolean {
  return weeklyScores.length >= 3 && getWeeklyAverage(weeklyScores) >= 5;
}

/**
 * Get overall mastery status for an item (across all time)
 * An item is "globally mastered" if it has ever achieved avg 4+ with 3+ exposures in a week
 */
export function getItemMasteryStatus(
  itemId: string,
  scores: SocializationScore[],
  arrivalDate: Date
): { mastered: boolean; bestAverage: number; totalExposures: number } {
  const itemScores = scores.filter((s) => s.itemId === itemId);
  const totalExposures = itemScores.length;
  
  if (totalExposures === 0) {
    return { mastered: false, bestAverage: 0, totalExposures: 0 };
  }
  
  // Calculate best weekly average
  // Group scores by week and find best week
  const scoresByWeek = new Map<number, number[]>();
  
  for (const score of itemScores) {
    const scoredAt = new Date(score.scoredAt);
    const weekNumber = Math.floor((scoredAt.getTime() - arrivalDate.getTime()) / (7 * 24 * 60 * 60 * 1000));
    const existing = scoresByWeek.get(weekNumber) || [];
    existing.push(score.score);
    scoresByWeek.set(weekNumber, existing);
  }
  
  let bestAverage = 0;
  let mastered = false;
  
  for (const weekScores of scoresByWeek.values()) {
    const avg = getWeeklyAverage(weekScores);
    if (avg > bestAverage) bestAverage = avg;
    if (weekScores.length >= 3 && avg >= 4) mastered = true;
  }
  
  return { mastered, bestAverage, totalExposures };
}

/**
 * Assign items to weeks deterministically
 * Returns which items should be in which week number
 * 
 * @param items - All socialization items
 * @param totalWeeks - Number of weeks to plan (default 20 to cover full window + maintenance)
 * @param aggressiveness - 1-5 setting to scale items per week (default 3)
 */
export function assignItemsToWeeks(
  items: SocializationItem[],
  totalWeeks: number = 20,
  aggressiveness: number = 3
): Map<number, string[]> {
  const weekAssignments = new Map<number, string[]>();
  
  // Sort items by category priority, then by sortOrder within category
  const sortedItems = [...items].sort((a, b) => {
    const aPriority = CATEGORY_PRIORITY[a.category] || 99;
    const bPriority = CATEGORY_PRIORITY[b.category] || 99;
    if (aPriority !== bPriority) return aPriority - bPriority;
    return a.sortOrder - b.sortOrder;
  });
  
  // Distribute items across weeks using aggressiveness-scaled counts
  let itemIndex = 0;
  
  for (let week = 1; week <= totalWeeks && itemIndex < sortedItems.length; week++) {
    const itemsThisWeek = getItemsPerWeek(week, aggressiveness);
    const weekItems: string[] = [];
    
    for (let i = 0; i < itemsThisWeek && itemIndex < sortedItems.length; i++) {
      weekItems.push(sortedItems[itemIndex].id);
      itemIndex++;
    }
    
    if (weekItems.length > 0) {
      weekAssignments.set(week, weekItems);
    }
  }
  
  // Any remaining items go into later weeks (maintenance)
  while (itemIndex < sortedItems.length) {
    const week = totalWeeks + 1 + Math.floor((itemIndex - sortedItems.length + sortedItems.length) / 2);
    const existing = weekAssignments.get(week) || [];
    existing.push(sortedItems[itemIndex].id);
    weekAssignments.set(week, existing);
    itemIndex++;
  }
  
  return weekAssignments;
}

export interface WeeklySocializationItem {
  item: SocializationItem;
  weeklyScores: number[];
  exposureCount: number;
  averageScore: number;
  isMastered: boolean;
  isExcellent: boolean;
  isCarryOver: boolean; // True if this item carried over from a previous week
  originalWeek: number; // The week this item was originally assigned
}

export interface WeeklySocializationBatch {
  weekNumber: number;
  items: WeeklySocializationItem[];
  allMastered: boolean;
  allExcellent: boolean;
  acceleratedItem: WeeklySocializationItem | null;
}

/**
 * Get the socialization batch for a specific week
 * Includes carry-overs from previous weeks and potential acceleration
 * 
 * @param weekNumber - Current training week
 * @param allItems - All socialization items
 * @param allScores - All recorded scores
 * @param arrivalDate - Dog's arrival date
 * @param weekStart - Start of current week
 * @param weekEnd - End of current week
 * @param aggressiveness - 1-5 setting to scale items per week (default 3)
 */
export function getWeeklySocializationBatch(
  weekNumber: number,
  allItems: SocializationItem[],
  allScores: SocializationScore[],
  arrivalDate: Date,
  weekStart: Date,
  weekEnd: Date,
  aggressiveness: number = 3
): WeeklySocializationBatch {
  const assignments = assignItemsToWeeks(allItems, 20, aggressiveness);
  const itemMap = new Map(allItems.map((i) => [i.id, i]));
  
  const batchItems: WeeklySocializationItem[] = [];
  
  // 1. Get items originally assigned to this week
  const thisWeekItemIds = assignments.get(weekNumber) || [];
  
  for (const itemId of thisWeekItemIds) {
    const item = itemMap.get(itemId);
    if (!item) continue;
    
    const weeklyScores = getWeeklyScores(itemId, allScores, weekStart, weekEnd);
    
    batchItems.push({
      item,
      weeklyScores,
      exposureCount: weeklyScores.length,
      averageScore: getWeeklyAverage(weeklyScores),
      isMastered: isItemMasteredThisWeek(weeklyScores),
      isExcellent: isItemExcellent(weeklyScores),
      isCarryOver: false,
      originalWeek: weekNumber,
    });
  }
  
  // 2. Add carry-overs from previous weeks (items not yet mastered)
  for (let prevWeek = 1; prevWeek < weekNumber; prevWeek++) {
    const prevWeekItemIds = assignments.get(prevWeek) || [];
    
    for (const itemId of prevWeekItemIds) {
      // Skip if already in batch
      if (batchItems.some((b) => b.item.id === itemId)) continue;
      
      const item = itemMap.get(itemId);
      if (!item) continue;
      
      // Check if this item was mastered in any previous week
      const masteryStatus = getItemMasteryStatus(itemId, allScores, arrivalDate);
      
      if (!masteryStatus.mastered) {
        // Not mastered yet, carry over
        const weeklyScores = getWeeklyScores(itemId, allScores, weekStart, weekEnd);
        
        batchItems.push({
          item,
          weeklyScores,
          exposureCount: weeklyScores.length,
          averageScore: getWeeklyAverage(weeklyScores),
          isMastered: isItemMasteredThisWeek(weeklyScores),
          isExcellent: isItemExcellent(weeklyScores),
          isCarryOver: true,
          originalWeek: prevWeek,
        });
      }
    }
  }
  
  // 3. Check for acceleration - if all items are excellent, pull one from next week
  const allExcellent = batchItems.length > 0 && batchItems.every((i) => i.isExcellent);
  const allMastered = batchItems.length > 0 && batchItems.every((i) => i.isMastered);
  let acceleratedItem: WeeklySocializationItem | null = null;
  
  if (allExcellent) {
    // Find the first item from the next week that isn't already mastered
    const nextWeekItemIds = assignments.get(weekNumber + 1) || [];
    
    for (const itemId of nextWeekItemIds) {
      const item = itemMap.get(itemId);
      if (!item) continue;
      
      // Check if already mastered
      const masteryStatus = getItemMasteryStatus(itemId, allScores, arrivalDate);
      if (!masteryStatus.mastered) {
        const weeklyScores = getWeeklyScores(itemId, allScores, weekStart, weekEnd);
        
        acceleratedItem = {
          item,
          weeklyScores,
          exposureCount: weeklyScores.length,
          averageScore: getWeeklyAverage(weeklyScores),
          isMastered: isItemMasteredThisWeek(weeklyScores),
          isExcellent: isItemExcellent(weeklyScores),
          isCarryOver: false,
          originalWeek: weekNumber + 1, // From next week
        };
        break;
      }
    }
  }
  
  return {
    weekNumber,
    items: batchItems,
    allMastered,
    allExcellent,
    acceleratedItem,
  };
}
