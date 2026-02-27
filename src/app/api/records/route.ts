import { NextResponse } from "next/server";
import { db, trainingRecords, commands } from "@/lib/db";
import { desc, eq, gte, lte, and, sql } from "drizzle-orm";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get("sessionId");
    const commandId = searchParams.get("commandId");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const limit = searchParams.get("limit");

    const conditions = [];

    if (sessionId) {
      conditions.push(eq(trainingRecords.sessionId, sessionId));
    }
    if (commandId) {
      conditions.push(eq(trainingRecords.commandId, commandId));
    }
    if (startDate) {
      conditions.push(gte(trainingRecords.createdAt, new Date(startDate)));
    }
    if (endDate) {
      conditions.push(lte(trainingRecords.createdAt, new Date(endDate)));
    }

    let query = db
      .select({
        record: trainingRecords,
        command: commands,
      })
      .from(trainingRecords)
      .leftJoin(commands, eq(trainingRecords.commandId, commands.id))
      .orderBy(desc(trainingRecords.createdAt));

    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as typeof query;
    }

    if (limit) {
      query = query.limit(parseInt(limit)) as typeof query;
    }

    const records = await query;
    return NextResponse.json(records);
  } catch (error) {
    console.error("Failed to fetch records:", error);
    return NextResponse.json({ error: "Failed to fetch records" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { sessionId, callId, commandId, result, responseTimeMs } = body;

    if (!callId || !commandId || !result) {
      return NextResponse.json(
        { error: "callId, commandId, and result are required" },
        { status: 400 }
      );
    }

    if (!["positive", "negative"].includes(result)) {
      return NextResponse.json(
        { error: "result must be 'positive' or 'negative'" },
        { status: 400 }
      );
    }

    const [newRecord] = await db
      .insert(trainingRecords)
      .values({
        sessionId: sessionId || null,
        callId,
        commandId,
        result,
        responseTimeMs: responseTimeMs || null,
      })
      .returning();

    return NextResponse.json(newRecord, { status: 201 });
  } catch (error) {
    console.error("Failed to create record:", error);
    return NextResponse.json({ error: "Failed to create record" }, { status: 500 });
  }
}
