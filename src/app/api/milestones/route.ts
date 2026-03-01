import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { milestones } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function GET() {
  try {
    const allMilestones = await db.select().from(milestones).orderBy(milestones.targetAgeWeeks);
    
    // Group by category
    const byCategory = allMilestones.reduce((acc, m) => {
      if (!acc[m.category]) {
        acc[m.category] = [];
      }
      acc[m.category].push(m);
      return acc;
    }, {} as Record<string, typeof allMilestones>);
    
    // Calculate stats
    const completed = allMilestones.filter((m) => m.status === "completed").length;
    const inProgress = allMilestones.filter((m) => m.status === "in_progress" || m.status === "enrolled").length;
    
    return NextResponse.json({
      milestones: allMilestones,
      byCategory,
      totalMilestones: allMilestones.length,
      completed,
      inProgress,
    });
  } catch (error) {
    console.error("Failed to fetch milestones:", error);
    return NextResponse.json(
      { error: "Failed to fetch milestones" },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { id, status, startedAt, completedAt, notes } = body;
    
    if (!id) {
      return NextResponse.json(
        { error: "Milestone ID is required" },
        { status: 400 }
      );
    }
    
    const updated = await db
      .update(milestones)
      .set({
        status,
        startedAt: startedAt ? new Date(startedAt) : undefined,
        completedAt: completedAt ? new Date(completedAt) : undefined,
        notes,
        updatedAt: new Date(),
      })
      .where(eq(milestones.id, id))
      .returning();
    
    if (updated.length === 0) {
      return NextResponse.json(
        { error: "Milestone not found" },
        { status: 404 }
      );
    }
    
    return NextResponse.json(updated[0]);
  } catch (error) {
    console.error("Failed to update milestone:", error);
    return NextResponse.json(
      { error: "Failed to update milestone" },
      { status: 500 }
    );
  }
}
