import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  dogProfile,
  commands,
  trainingSessions,
  trainingRecords,
  socializationItems,
  socializationScores,
  completedGoals,
} from "@/lib/db/schema";
import { eq } from "drizzle-orm";

// Generate sample training data for simulation testing
// This creates realistic-looking historical data up to the simulated date

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { upToDate, clearExisting = false } = body;
    
    if (!upToDate) {
      return NextResponse.json(
        { error: "upToDate is required" },
        { status: 400 }
      );
    }
    
    const targetDate = new Date(upToDate);
    
    // Fetch profile and commands
    const [profiles, allCommands, socItems] = await Promise.all([
      db.select().from(dogProfile).limit(1),
      db.select().from(commands),
      db.select().from(socializationItems),
    ]);
    
    if (profiles.length === 0) {
      return NextResponse.json(
        { error: "No dog profile found" },
        { status: 404 }
      );
    }
    
    const profile = profiles[0];
    const arrivalDate = new Date(profile.arrivalDate);
    
    // Don't generate data before arrival
    if (targetDate < arrivalDate) {
      return NextResponse.json({
        message: "No data generated - target date is before arrival",
        generated: { sessions: 0, records: 0, socializationScores: 0 },
      });
    }
    
    // Clear existing data if requested
    if (clearExisting) {
      // Delete in order to respect foreign key constraints
      await db.delete(trainingRecords);
      await db.delete(trainingSessions);
      await db.delete(socializationScores);
      await db.delete(completedGoals);
      
      // Reset command exposure counts
      await db.update(commands).set({ exposureCount: 0 });
    }
    
    // Calculate days since arrival
    const daysSinceArrival = Math.floor(
      (targetDate.getTime() - arrivalDate.getTime()) / (1000 * 60 * 60 * 24)
    );
    
    // Generate sessions - roughly 3 per day on 6 days per week
    const sessionsToGenerate = Math.floor(daysSinceArrival * 0.75 * 3); // 75% of days, 3 sessions
    
    // Determine which commands should be active based on weeks
    const weeksSinceArrival = Math.floor(daysSinceArrival / 7);
    const activeCommands = allCommands.filter((cmd) => {
      // Tier 0 from start
      if (cmd.tier === "tier_0") return true;
      // Tier A after week 2
      if (cmd.tier === "tier_a" && weeksSinceArrival >= 2) return true;
      // Tier B after week 8
      if (cmd.tier === "tier_b" && weeksSinceArrival >= 8) return true;
      // Tier C after week 17
      if (cmd.tier === "tier_c" && weeksSinceArrival >= 17) return true;
      // Tier D after week 37
      if (cmd.tier === "tier_d" && weeksSinceArrival >= 37) return true;
      return false;
    });
    
    const generatedSessions: string[] = [];
    const generatedRecords: { sessionId: string; commandId: string; result: "positive" | "negative" }[] = [];
    const commandExposures: Record<string, number> = {};
    
    // Generate sessions spread across the time period
    for (let i = 0; i < sessionsToGenerate; i++) {
      const dayOffset = Math.floor(i / 3); // ~3 sessions per day
      const sessionDate = new Date(arrivalDate);
      sessionDate.setDate(sessionDate.getDate() + dayOffset);
      sessionDate.setHours(8 + (i % 3) * 4); // Morning, noon, evening
      
      if (sessionDate > targetDate) break;
      
      // Create session
      const sessionDuration = 5 + Math.random() * 10; // 5-15 minutes
      const endDate = new Date(sessionDate);
      endDate.setMinutes(endDate.getMinutes() + sessionDuration);
      
      const [session] = await db.insert(trainingSessions).values({
        startedAt: sessionDate,
        endedAt: endDate,
      }).returning();
      
      generatedSessions.push(session.id);
      
      // Generate 5-15 command attempts per session
      const attemptsPerSession = 5 + Math.floor(Math.random() * 11);
      
      for (let j = 0; j < attemptsPerSession; j++) {
        // Pick a random active command
        const cmd = activeCommands[Math.floor(Math.random() * activeCommands.length)];
        if (!cmd) continue;
        
        // Calculate success rate based on weeks of training
        // Starts at 60%, increases to 90% over 12 weeks
        const weeksTraining = Math.min(12, weeksSinceArrival);
        const baseSuccessRate = 0.6 + (weeksTraining / 12) * 0.3;
        
        // Marks have higher success rate
        const successRate = cmd.parentFamily === "Marks" ? 0.95 : baseSuccessRate;
        
        const isPositive = Math.random() < successRate;
        const responseTime = isPositive 
          ? 500 + Math.floor(Math.random() * 2000) // 500-2500ms for positive
          : null;
        
        const callId = crypto.randomUUID();
        
        await db.insert(trainingRecords).values({
          sessionId: session.id,
          callId,
          commandId: cmd.id,
          result: isPositive ? "positive" : "negative",
          responseTimeMs: responseTime,
          createdAt: sessionDate,
        });
        
        generatedRecords.push({
          sessionId: session.id,
          commandId: cmd.id,
          result: isPositive ? "positive" : "negative",
        });
        
        // Track exposures
        commandExposures[cmd.id] = (commandExposures[cmd.id] || 0) + 1;
      }
    }
    
    // Update command exposure counts
    for (const [cmdId, count] of Object.entries(commandExposures)) {
      await db.update(commands)
        .set({ exposureCount: count })
        .where(eq(commands.id, cmdId));
    }
    
    // Generate socialization scores
    // During first 8 weeks, do about 3-5 items per day
    const socializationWeeks = Math.min(8, weeksSinceArrival);
    const socItemsToScore = Math.min(
      socItems.length,
      Math.floor(socializationWeeks * 6 * 4) // ~4 per day, 6 days per week
    );
    
    // Shuffle and pick items to score
    const shuffledItems = [...socItems].sort(() => Math.random() - 0.5);
    const itemsToScore = shuffledItems.slice(0, socItemsToScore);
    
    const generatedSocScores: string[] = [];
    
    for (let i = 0; i < itemsToScore.length; i++) {
      const item = itemsToScore[i];
      const dayOffset = Math.floor(i / 4); // ~4 items per day
      const scoreDate = new Date(arrivalDate);
      scoreDate.setDate(scoreDate.getDate() + dayOffset);
      
      if (scoreDate > targetDate) break;
      
      // Generate score (weighted towards higher scores as training progresses)
      const weeksIn = Math.floor(dayOffset / 7);
      const baseScore = 2 + (weeksIn / 8) * 2; // Starts at 2, increases to 4
      const score = Math.min(5, Math.max(1, Math.round(baseScore + (Math.random() - 0.5) * 2)));
      
      const [socScore] = await db.insert(socializationScores).values({
        itemId: item.id,
        score,
        scoredAt: scoreDate,
      }).returning();
      
      generatedSocScores.push(socScore.id);
    }
    
    return NextResponse.json({
      message: "Sample data generated successfully",
      generated: {
        sessions: generatedSessions.length,
        records: generatedRecords.length,
        socializationScores: generatedSocScores.length,
        daysSimulated: daysSinceArrival,
        weeksSinceArrival,
      },
    });
  } catch (error) {
    console.error("Failed to generate sample data:", error);
    return NextResponse.json(
      { error: "Failed to generate sample data" },
      { status: 500 }
    );
  }
}

// Clear all generated data
export async function DELETE() {
  try {
    // Delete in order to respect foreign key constraints
    // 1. Delete child tables first (training_records references training_sessions)
    await db.delete(trainingRecords);
    await db.delete(trainingSessions);
    await db.delete(socializationScores);
    await db.delete(completedGoals);
    
    // Reset command exposure counts
    await db.update(commands).set({ exposureCount: 0 });
    
    return NextResponse.json({
      message: "All training data cleared",
    });
  } catch (error) {
    console.error("Failed to clear data:", error);
    return NextResponse.json(
      { error: "Failed to clear data" },
      { status: 500 }
    );
  }
}
