import { NextResponse } from "next/server";
import { db, soundSettings } from "@/lib/db";
import { eq } from "drizzle-orm";

export async function GET() {
  try {
    const settings = await db.select().from(soundSettings);
    const active = settings.find((s) => s.isActive) || settings[0] || null;
    return NextResponse.json({ settings, active });
  } catch (error) {
    console.error("Failed to fetch settings:", error);
    return NextResponse.json({ error: "Failed to fetch settings" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, soundType, frequency, shortDurationMs, longDurationMs, silenceDurationMs, isActive } = body;

    if (!name) {
      return NextResponse.json({ error: "name is required" }, { status: 400 });
    }

    // If this preset should be active, deactivate all others
    if (isActive) {
      await db.update(soundSettings).set({ isActive: false });
    }

    const [newSettings] = await db
      .insert(soundSettings)
      .values({
        name,
        soundType: soundType || "beep",
        frequency: frequency || 800,
        shortDurationMs: shortDurationMs || 100,
        longDurationMs: longDurationMs || 300,
        silenceDurationMs: silenceDurationMs || 150,
        isActive: isActive || false,
      })
      .returning();

    return NextResponse.json(newSettings, { status: 201 });
  } catch (error) {
    console.error("Failed to create settings:", error);
    return NextResponse.json({ error: "Failed to create settings" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    }

    // If setting this preset as active, deactivate all others
    if (updates.isActive) {
      await db.update(soundSettings).set({ isActive: false });
    }

    const [updated] = await db
      .update(soundSettings)
      .set(updates)
      .where(eq(soundSettings.id, id))
      .returning();

    if (!updated) {
      return NextResponse.json({ error: "Settings not found" }, { status: 404 });
    }

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Failed to update settings:", error);
    return NextResponse.json({ error: "Failed to update settings" }, { status: 500 });
  }
}
