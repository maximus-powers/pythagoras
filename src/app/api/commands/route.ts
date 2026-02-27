import { NextResponse } from "next/server";
import { db, commands } from "@/lib/db";
import { eq } from "drizzle-orm";

export async function GET() {
  try {
    const allCommands = await db.select().from(commands).orderBy(commands.parentFamily, commands.family, commands.word);
    return NextResponse.json(allCommands);
  } catch (error) {
    console.error("Failed to fetch commands:", error);
    return NextResponse.json({ error: "Failed to fetch commands" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { word, sequence, parentFamily, family, description } = body;

    if (!word || !sequence || !parentFamily) {
      return NextResponse.json(
        { error: "word, sequence, and parentFamily are required" },
        { status: 400 }
      );
    }

    const [newCommand] = await db
      .insert(commands)
      .values({
        word,
        sequence,
        parentFamily,
        family: family || null,
        description: description || null,
      })
      .returning();

    return NextResponse.json(newCommand, { status: 201 });
  } catch (error) {
    console.error("Failed to create command:", error);
    return NextResponse.json({ error: "Failed to create command" }, { status: 500 });
  }
}
