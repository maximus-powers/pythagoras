import { NextResponse } from "next/server";
import { db, trainingSessions } from "@/lib/db";
import { desc, isNull } from "drizzle-orm";

export async function GET() {
  try {
    const sessions = await db
      .select()
      .from(trainingSessions)
      .orderBy(desc(trainingSessions.startedAt));
    return NextResponse.json(sessions);
  } catch (error) {
    console.error("Failed to fetch sessions:", error);
    return NextResponse.json({ error: "Failed to fetch sessions" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { notes } = body;

    const [newSession] = await db
      .insert(trainingSessions)
      .values({
        notes: notes || null,
      })
      .returning();

    return NextResponse.json(newSession, { status: 201 });
  } catch (error) {
    console.error("Failed to create session:", error);
    return NextResponse.json({ error: "Failed to create session" }, { status: 500 });
  }
}
