import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { dogProfile } from "@/lib/db/schema";
import { getDevelopmentalInfo, formatAge } from "@/lib/training";

export async function GET(request: Request) {
  try {
    // Support simulated date via query parameter
    const { searchParams } = new URL(request.url);
    const asOfParam = searchParams.get("asOf");
    const asOf = asOfParam ? new Date(asOfParam) : new Date();
    
    const profiles = await db.select().from(dogProfile).limit(1);
    
    if (profiles.length === 0) {
      return NextResponse.json(
        { error: "No dog profile found" },
        { status: 404 }
      );
    }
    
    const profile = profiles[0];
    const birthDate = new Date(profile.birthDate);
    const arrivalDate = new Date(profile.arrivalDate);
    
    const developmentalInfo = getDevelopmentalInfo(birthDate, arrivalDate, asOf);
    
    return NextResponse.json({
      ...profile,
      developmentalInfo,
      formattedAge: formatAge(developmentalInfo.ageWeeks),
      simulatedDate: asOfParam ? asOf.toISOString() : null,
    });
  } catch (error) {
    console.error("Failed to fetch dog profile:", error);
    return NextResponse.json(
      { error: "Failed to fetch dog profile" },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { name, nickname, breed, birthDate, arrivalDate } = body;
    
    const profiles = await db.select().from(dogProfile).limit(1);
    
    if (profiles.length === 0) {
      // Create new profile
      const newProfile = await db.insert(dogProfile).values({
        name,
        nickname,
        breed,
        birthDate,
        arrivalDate,
      }).returning();
      
      return NextResponse.json(newProfile[0]);
    }
    
    // Update existing profile
    const updated = await db
      .update(dogProfile)
      .set({
        name,
        nickname,
        breed,
        birthDate,
        arrivalDate,
        updatedAt: new Date(),
      })
      .returning();
    
    return NextResponse.json(updated[0]);
  } catch (error) {
    console.error("Failed to update dog profile:", error);
    return NextResponse.json(
      { error: "Failed to update dog profile" },
      { status: 500 }
    );
  }
}
