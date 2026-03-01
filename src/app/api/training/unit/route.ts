import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  dogProfile,
  trainingSettings,
  trainingTracks,
  commands,
  trainingRecords,
  socializationItems,
  socializationScores,
  completedGoals,
  milestones,
} from "@/lib/db/schema";
import { generateWeeklyUnit, getPreArrivalUnit } from "@/lib/training";

export async function GET(request: Request) {
  try {
    // Support simulated date via query parameter
    const { searchParams } = new URL(request.url);
    const asOfParam = searchParams.get("asOf");
    const now = asOfParam ? new Date(asOfParam) : new Date();
    
    // Fetch all required data in parallel
    const [
      profileResult,
      settingsResult,
      tracksResult,
      commandsResult,
      recordsResult,
      socItemsResult,
      socScoresResult,
      completedResult,
      milestonesResult,
    ] = await Promise.all([
      db.select().from(dogProfile).limit(1),
      db.select().from(trainingSettings).limit(1),
      db.select().from(trainingTracks),
      db.select().from(commands),
      db.select().from(trainingRecords),
      db.select().from(socializationItems),
      db.select().from(socializationScores),
      db.select().from(completedGoals),
      db.select().from(milestones),
    ]);
    
    if (profileResult.length === 0) {
      return NextResponse.json(
        { error: "No dog profile found. Please set up your dog profile first." },
        { status: 404 }
      );
    }
    
    const profile = profileResult[0];
    const settings = settingsResult[0] || {
      aggressiveness: 3,
      weeklyTrainingHours: "5.0",
      sessionsPerDay: 3,
      minutesPerSession: 8,
      trainingDaysPerWeek: 6,
    };
    
    const birthDate = new Date(profile.birthDate);
    const arrivalDate = new Date(profile.arrivalDate);
    
    // Check if dog has arrived
    if (now < arrivalDate) {
      const preArrivalUnit = getPreArrivalUnit(birthDate, arrivalDate, now);
      return NextResponse.json({
        ...preArrivalUnit,
        dogName: profile.name,
        dogNickname: profile.nickname,
        simulatedDate: asOfParam ? now.toISOString() : null,
      });
    }
    
    // Generate the weekly unit
    const unit = generateWeeklyUnit(
      birthDate,
      arrivalDate,
      settings as any,
      tracksResult,
      commandsResult,
      recordsResult,
      socItemsResult,
      socScoresResult,
      completedResult,
      milestonesResult,
      now
    );
    
    return NextResponse.json({
      ...unit,
      dogName: profile.name,
      dogNickname: profile.nickname,
      simulatedDate: asOfParam ? now.toISOString() : null,
    });
  } catch (error) {
    console.error("Failed to generate training unit:", error);
    return NextResponse.json(
      { error: "Failed to generate training unit" },
      { status: 500 }
    );
  }
}
