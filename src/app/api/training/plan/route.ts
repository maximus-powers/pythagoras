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
import { getTrainingWeekNumber } from "@/lib/training/age";

// Generate units for the full training plan (78 weeks / 18 months)
const TOTAL_WEEKS = 78;

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
    
    // Calculate current week number
    const currentWeekNumber = now < arrivalDate ? 0 : getTrainingWeekNumber(arrivalDate, now);

    // Generate units for all weeks
    const units = [];

    // If before arrival, add pre-arrival unit first
    if (now < arrivalDate) {
      const preArrivalUnit = getPreArrivalUnit(birthDate, arrivalDate, now);
      units.push({
        ...preArrivalUnit,
        weekNumber: 0,
        isCurrent: true,
        isPast: false,
        isFuture: false,
      });
    }

    // Generate units for each training week (1 through TOTAL_WEEKS)
    for (let weekNum = 1; weekNum <= TOTAL_WEEKS; weekNum++) {
      // Calculate the date for this week (week 1 = arrival date, week 2 = arrival + 7 days, etc.)
      const weekDate = new Date(arrivalDate);
      weekDate.setDate(weekDate.getDate() + (weekNum - 1) * 7);

      // Determine if this is a future week (for projection mode)
      const isFutureWeek = weekNum > currentWeekNumber;
      
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
        weekDate,
        isFutureWeek // isProjection flag
      );

      units.push({
        ...unit,
        isCurrent: weekNum === currentWeekNumber,
        isPast: weekNum < currentWeekNumber,
        isFuture: isFutureWeek,
      });
    }

    return NextResponse.json({
      units,
      currentWeekNumber,
      dogName: profile.name,
      dogNickname: profile.nickname,
      simulatedDate: asOfParam ? now.toISOString() : null,
    });
  } catch (error) {
    console.error("Failed to generate training plan:", error);
    return NextResponse.json(
      { error: "Failed to generate training plan" },
      { status: 500 }
    );
  }
}
