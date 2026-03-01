import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { socializationItems, socializationScores } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";

export async function GET() {
  try {
    // Fetch all items
    const items = await db.select().from(socializationItems).orderBy(socializationItems.sortOrder);
    
    // Fetch all scores
    const scores = await db.select().from(socializationScores).orderBy(desc(socializationScores.scoredAt));
    
    // Group scores by item and calculate stats
    const itemsWithScores = items.map((item) => {
      const itemScores = scores.filter((s) => s.itemId === item.id);
      const highestScore = itemScores.length > 0 ? Math.max(...itemScores.map((s) => s.score)) : 0;
      const latestScore = itemScores[0]?.score || null;
      const latestScoredAt = itemScores[0]?.scoredAt || null;
      const totalExposures = itemScores.length;
      
      return {
        ...item,
        highestScore,
        latestScore,
        latestScoredAt,
        totalExposures,
        scores: itemScores,
      };
    });
    
    // Group by category
    const byCategory = itemsWithScores.reduce((acc, item) => {
      if (!acc[item.category]) {
        acc[item.category] = [];
      }
      acc[item.category].push(item);
      return acc;
    }, {} as Record<string, typeof itemsWithScores>);
    
    // Calculate category stats
    const categoryStats = Object.entries(byCategory).map(([category, items]) => {
      const totalItems = items.length;
      const itemsScored = items.filter((i) => i.highestScore > 0).length;
      const itemsMastered = items.filter((i) => i.highestScore >= 4).length;
      const averageScore = items.reduce((sum, i) => sum + i.highestScore, 0) / totalItems;
      
      return {
        category,
        totalItems,
        itemsScored,
        itemsMastered,
        averageScore,
        progress: (itemsMastered / totalItems) * 100,
      };
    });
    
    return NextResponse.json({
      items: itemsWithScores,
      byCategory,
      categoryStats,
      totalItems: items.length,
      totalScored: itemsWithScores.filter((i) => i.highestScore > 0).length,
      totalMastered: itemsWithScores.filter((i) => i.highestScore >= 4).length,
    });
  } catch (error) {
    console.error("Failed to fetch socialization items:", error);
    return NextResponse.json(
      { error: "Failed to fetch socialization items" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { itemId, score, notes } = body;
    
    if (!itemId || score === undefined || score < 1 || score > 5) {
      return NextResponse.json(
        { error: "Item ID and score (1-5) are required" },
        { status: 400 }
      );
    }
    
    // Verify item exists
    const item = await db
      .select()
      .from(socializationItems)
      .where(eq(socializationItems.id, itemId))
      .limit(1);
    
    if (item.length === 0) {
      return NextResponse.json(
        { error: "Socialization item not found" },
        { status: 404 }
      );
    }
    
    // Add score
    const newScore = await db.insert(socializationScores).values({
      itemId,
      score,
      notes,
      scoredAt: new Date(),
    }).returning();
    
    return NextResponse.json(newScore[0]);
  } catch (error) {
    console.error("Failed to add socialization score:", error);
    return NextResponse.json(
      { error: "Failed to add socialization score" },
      { status: 500 }
    );
  }
}
