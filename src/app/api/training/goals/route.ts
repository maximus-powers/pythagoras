import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { completedGoals } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

// Valid enum values - updated for new session-based structure
// Note: Old track names kept for backward compatibility with database
const VALID_TRACKS = [
  "t1_sessions",     // New: Combined sessions track
  "t1_obedience",    // Legacy
  "t2_socialization", 
  "t3_communication", 
  "t4_impulse",      // Legacy
  "t5_enrichment"    // Legacy
] as const;
const VALID_GOAL_TYPES = [
  "session",           // New: Training session
  "session_activity",  // New: Individual activity in session
  "socialization_item",
  "exposure_count",    // Communication pairing
  "milestone",
  // Legacy types for backward compatibility
  "mastery_gate", 
  "enrichment_activity", 
  "time_based_hold", 
  "class_attendance"
] as const;

type Track = typeof VALID_TRACKS[number];
type GoalType = typeof VALID_GOAL_TYPES[number];

export async function GET() {
  try {
    const goals = await db.select().from(completedGoals);
    return NextResponse.json(goals);
  } catch (error) {
    console.error("Failed to fetch completed goals:", error);
    return NextResponse.json(
      { error: "Failed to fetch completed goals" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  let body: Record<string, unknown> = {};
  
  try {
    body = await request.json();
  } catch (parseError) {
    console.error("Failed to parse request body:", parseError);
    return NextResponse.json(
      { error: "Invalid JSON in request body" },
      { status: 400 }
    );
  }
  
  try {
    const { goalKey, track, goalType, title, notes } = body;
    
    console.log("Completing goal:", { goalKey, track, goalType, title });
    
    if (!goalKey || !track || !goalType || !title) {
      return NextResponse.json(
        { error: "Missing required fields", received: { goalKey, track, goalType, title } },
        { status: 400 }
      );
    }
    
    // Validate enum values
    if (!VALID_TRACKS.includes(track as Track)) {
      return NextResponse.json(
        { error: `Invalid track: ${track}. Valid values: ${VALID_TRACKS.join(", ")}` },
        { status: 400 }
      );
    }
    
    if (!VALID_GOAL_TYPES.includes(goalType as GoalType)) {
      return NextResponse.json(
        { error: `Invalid goalType: ${goalType}. Valid values: ${VALID_GOAL_TYPES.join(", ")}` },
        { status: 400 }
      );
    }
    
    // Map new track names to database-compatible names (for Postgres enum compatibility)
    const dbTrackMap: Record<string, string> = {
      t1_sessions: "t1_obedience", // Map sessions to obedience for storage
    };
    const dbTrack = dbTrackMap[track as string] || track;
    
    // Map new goal types to database-compatible names
    const dbGoalTypeMap: Record<string, string> = {
      session: "enrichment_activity", // Map session to enrichment_activity for storage
      session_activity: "enrichment_activity",
    };
    const dbGoalType = dbGoalTypeMap[goalType as string] || goalType;
    
    // For multi-instance goals (like "Puzzle Feeder 3x"), we store each completion
    // with a unique instance key like "goalKey_instance_1", "goalKey_instance_2", etc.
    const isMultiInstance = body.targetCount && Number(body.targetCount) > 1;
    
    if (isMultiInstance) {
      // Count existing completions for this base goal
      const existingCompletions = await db
        .select()
        .from(completedGoals)
        .where(eq(completedGoals.goalKey, goalKey as string));
      
      // Also count instance completions
      const allCompletions = await db.select().from(completedGoals);
      const instanceCount = allCompletions.filter(
        (g) => g.goalKey.startsWith(`${goalKey}_instance_`)
      ).length;
      
      const targetCount = Number(body.targetCount);
      
      if (instanceCount >= targetCount) {
        return NextResponse.json(
          { error: "All instances already completed", count: instanceCount, target: targetCount },
          { status: 409 }
        );
      }
      
      // Create a new instance completion
      const instanceKey = `${goalKey}_instance_${instanceCount + 1}`;
      const newGoal = await db.insert(completedGoals).values({
        goalKey: instanceKey,
        track: dbTrack as any,
        goalType: dbGoalType as any,
        title: `${title} (${instanceCount + 1}/${targetCount})`,
        notes: notes as string | undefined,
        completedAt: new Date(),
      }).returning();
      
      console.log("Instance completed:", newGoal[0], `(${instanceCount + 1}/${targetCount})`);
      return NextResponse.json({ 
        ...newGoal[0], 
        instanceNumber: instanceCount + 1,
        totalInstances: targetCount,
        isComplete: instanceCount + 1 >= targetCount
      });
    }
    
    // Single-instance goal - check if already completed
    const existing = await db
      .select()
      .from(completedGoals)
      .where(eq(completedGoals.goalKey, goalKey as string))
      .limit(1);
    
    if (existing.length > 0) {
      return NextResponse.json(
        { error: "Goal already completed", goal: existing[0] },
        { status: 409 }
      );
    }
    
    // Mark goal as completed
    const newGoal = await db.insert(completedGoals).values({
      goalKey: goalKey as string,
      track: dbTrack as any,
      goalType: dbGoalType as any,
      title: title as string,
      notes: notes as string | undefined,
      completedAt: new Date(),
    }).returning();
    
    console.log("Goal completed successfully:", newGoal[0]);
    return NextResponse.json(newGoal[0]);
  } catch (error) {
    console.error("Failed to complete goal:", error);
    // Return more detailed error info
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;
    return NextResponse.json(
      { error: "Failed to complete goal", details: errorMessage, stack: errorStack },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const goalKey = searchParams.get("goalKey");
    
    if (!goalKey) {
      return NextResponse.json(
        { error: "Goal key is required" },
        { status: 400 }
      );
    }
    
    await db.delete(completedGoals).where(eq(completedGoals.goalKey, goalKey));
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete completed goal:", error);
    return NextResponse.json(
      { error: "Failed to delete completed goal" },
      { status: 500 }
    );
  }
}
