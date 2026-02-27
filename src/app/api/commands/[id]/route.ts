import { NextResponse } from "next/server";
import { db, commands } from "@/lib/db";
import { eq } from "drizzle-orm";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const [command] = await db.select().from(commands).where(eq(commands.id, id));
    
    if (!command) {
      return NextResponse.json({ error: "Command not found" }, { status: 404 });
    }
    
    return NextResponse.json(command);
  } catch (error) {
    console.error("Failed to fetch command:", error);
    return NextResponse.json({ error: "Failed to fetch command" }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { word, sequence, parentFamily, family, description } = body;

    const [updated] = await db
      .update(commands)
      .set({
        word,
        sequence,
        parentFamily,
        family: family || null,
        description: description || null,
        updatedAt: new Date(),
      })
      .where(eq(commands.id, id))
      .returning();

    if (!updated) {
      return NextResponse.json({ error: "Command not found" }, { status: 404 });
    }

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Failed to update command:", error);
    return NextResponse.json({ error: "Failed to update command" }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const [deleted] = await db
      .delete(commands)
      .where(eq(commands.id, id))
      .returning();

    if (!deleted) {
      return NextResponse.json({ error: "Command not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete command:", error);
    return NextResponse.json({ error: "Failed to delete command" }, { status: 500 });
  }
}
