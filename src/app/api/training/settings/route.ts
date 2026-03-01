import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { trainingSettings } from "@/lib/db/schema";

export async function GET() {
  try {
    const settings = await db.select().from(trainingSettings).limit(1);
    
    if (settings.length === 0) {
      // Return defaults
      return NextResponse.json({
        aggressiveness: 3,
        weeklyTrainingHours: "5.0",
        sessionsPerDay: 3,
        minutesPerSession: 8,
        trainingDaysPerWeek: 6,
      });
    }
    
    return NextResponse.json(settings[0]);
  } catch (error) {
    console.error("Failed to fetch training settings:", error);
    return NextResponse.json(
      { error: "Failed to fetch training settings" },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const {
      aggressiveness,
      weeklyTrainingHours,
      sessionsPerDay,
      minutesPerSession,
      trainingDaysPerWeek,
    } = body;
    
    const existing = await db.select().from(trainingSettings).limit(1);
    
    if (existing.length === 0) {
      // Create new settings
      const newSettings = await db.insert(trainingSettings).values({
        aggressiveness,
        weeklyTrainingHours,
        sessionsPerDay,
        minutesPerSession,
        trainingDaysPerWeek,
      }).returning();
      
      return NextResponse.json(newSettings[0]);
    }
    
    // Update existing settings
    const updated = await db
      .update(trainingSettings)
      .set({
        aggressiveness,
        weeklyTrainingHours,
        sessionsPerDay,
        minutesPerSession,
        trainingDaysPerWeek,
        updatedAt: new Date(),
      })
      .returning();
    
    return NextResponse.json(updated[0]);
  } catch (error) {
    console.error("Failed to update training settings:", error);
    return NextResponse.json(
      { error: "Failed to update training settings" },
      { status: 500 }
    );
  }
}
