import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { commands } from "@/lib/db/schema";
import { eq, sql } from "drizzle-orm";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { commandId } = body;

    if (!commandId) {
      return NextResponse.json(
        { error: "Command ID is required" },
        { status: 400 }
      );
    }

    // Increment exposure count
    const updated = await db
      .update(commands)
      .set({
        exposureCount: sql`COALESCE(${commands.exposureCount}, 0) + 1`,
        updatedAt: new Date(),
      })
      .where(eq(commands.id, commandId))
      .returning();

    if (updated.length === 0) {
      return NextResponse.json(
        { error: "Command not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      commandId,
      newExposureCount: updated[0].exposureCount,
    });
  } catch (error) {
    console.error("Failed to increment exposure count:", error);
    return NextResponse.json(
      { error: "Failed to increment exposure count" },
      { status: 500 }
    );
  }
}
