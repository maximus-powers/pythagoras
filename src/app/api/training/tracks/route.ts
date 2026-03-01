import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { trainingTracks } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function GET() {
  try {
    const tracks = await db.select().from(trainingTracks);
    return NextResponse.json(tracks);
  } catch (error) {
    console.error("Failed to fetch training tracks:", error);
    return NextResponse.json(
      { error: "Failed to fetch training tracks" },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { track, currentTier, currentPhase, offLeashRung } = body;
    
    if (!track) {
      return NextResponse.json(
        { error: "Track is required" },
        { status: 400 }
      );
    }
    
    const existing = await db
      .select()
      .from(trainingTracks)
      .where(eq(trainingTracks.track, track))
      .limit(1);
    
    if (existing.length === 0) {
      return NextResponse.json(
        { error: "Track not found" },
        { status: 404 }
      );
    }
    
    const updated = await db
      .update(trainingTracks)
      .set({
        currentTier,
        currentPhase,
        offLeashRung,
        updatedAt: new Date(),
      })
      .where(eq(trainingTracks.track, track))
      .returning();
    
    return NextResponse.json(updated[0]);
  } catch (error) {
    console.error("Failed to update training track:", error);
    return NextResponse.json(
      { error: "Failed to update training track" },
      { status: 500 }
    );
  }
}
