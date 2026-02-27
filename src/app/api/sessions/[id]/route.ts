import { NextResponse } from "next/server";
import { db, trainingSessions, trainingRecords } from "@/lib/db";
import { eq, sql } from "drizzle-orm";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const [session] = await db
      .select()
      .from(trainingSessions)
      .where(eq(trainingSessions.id, id));

    if (!session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    // Get session stats
    const stats = await db
      .select({
        totalRecords: sql<number>`count(*)::int`,
        positiveCount: sql<number>`count(*) filter (where ${trainingRecords.result} = 'positive')::int`,
        negativeCount: sql<number>`count(*) filter (where ${trainingRecords.result} = 'negative')::int`,
        avgResponseTime: sql<number>`avg(${trainingRecords.responseTimeMs})::int`,
      })
      .from(trainingRecords)
      .where(eq(trainingRecords.sessionId, id));

    return NextResponse.json({
      ...session,
      stats: stats[0],
    });
  } catch (error) {
    console.error("Failed to fetch session:", error);
    return NextResponse.json({ error: "Failed to fetch session" }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { notes, endSession } = body;

    const updateData: Record<string, unknown> = {};
    
    if (notes !== undefined) {
      updateData.notes = notes;
    }
    
    if (endSession) {
      updateData.endedAt = new Date();
    }

    const [updated] = await db
      .update(trainingSessions)
      .set(updateData)
      .where(eq(trainingSessions.id, id))
      .returning();

    if (!updated) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Failed to update session:", error);
    return NextResponse.json({ error: "Failed to update session" }, { status: 500 });
  }
}
