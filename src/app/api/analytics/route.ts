import { NextResponse } from "next/server";
import { db, trainingRecords, commands } from "@/lib/db";
import { eq, gte, lte, and, sql, desc } from "drizzle-orm";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    const conditions = [];

    if (startDate) {
      conditions.push(gte(trainingRecords.createdAt, new Date(startDate)));
    }
    if (endDate) {
      conditions.push(lte(trainingRecords.createdAt, new Date(endDate)));
    }

    // Command-wise statistics
    const commandStatsQuery = db
      .select({
        commandId: trainingRecords.commandId,
        word: commands.word,
        sequence: commands.sequence,
        parentFamily: commands.parentFamily,
        family: commands.family,
        totalAttempts: sql<number>`count(*)::int`,
        positiveCount: sql<number>`count(*) filter (where ${trainingRecords.result} = 'positive')::int`,
        negativeCount: sql<number>`count(*) filter (where ${trainingRecords.result} = 'negative')::int`,
        avgResponseTimeMs: sql<number>`avg(${trainingRecords.responseTimeMs})::int`,
        successRate: sql<number>`(count(*) filter (where ${trainingRecords.result} = 'positive')::float / nullif(count(*)::float, 0) * 100)::int`,
      })
      .from(trainingRecords)
      .innerJoin(commands, eq(trainingRecords.commandId, commands.id))
      .groupBy(trainingRecords.commandId, commands.word, commands.sequence, commands.parentFamily, commands.family)
      .orderBy(desc(sql`count(*)`));

    if (conditions.length > 0) {
      commandStatsQuery.where(and(...conditions));
    }

    const commandStats = await commandStatsQuery;

    // Overall statistics
    let overallQuery = db
      .select({
        totalRecords: sql<number>`count(*)::int`,
        positiveCount: sql<number>`count(*) filter (where ${trainingRecords.result} = 'positive')::int`,
        negativeCount: sql<number>`count(*) filter (where ${trainingRecords.result} = 'negative')::int`,
        avgResponseTimeMs: sql<number>`avg(${trainingRecords.responseTimeMs})::int`,
        uniqueCommands: sql<number>`count(distinct ${trainingRecords.commandId})::int`,
        uniqueSessions: sql<number>`count(distinct ${trainingRecords.sessionId})::int`,
      })
      .from(trainingRecords);

    if (conditions.length > 0) {
      overallQuery = overallQuery.where(and(...conditions)) as typeof overallQuery;
    }

    const [overall] = await overallQuery;

    // Daily activity for the date range (or last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const dailyConditions = [
      gte(trainingRecords.createdAt, startDate ? new Date(startDate) : thirtyDaysAgo),
    ];
    if (endDate) {
      dailyConditions.push(lte(trainingRecords.createdAt, new Date(endDate)));
    }

    const dailyActivity = await db
      .select({
        date: sql<string>`date(${trainingRecords.createdAt})`,
        totalRecords: sql<number>`count(*)::int`,
        positiveCount: sql<number>`count(*) filter (where ${trainingRecords.result} = 'positive')::int`,
        negativeCount: sql<number>`count(*) filter (where ${trainingRecords.result} = 'negative')::int`,
      })
      .from(trainingRecords)
      .where(and(...dailyConditions))
      .groupBy(sql`date(${trainingRecords.createdAt})`)
      .orderBy(sql`date(${trainingRecords.createdAt})`);

    return NextResponse.json({
      overall,
      commandStats,
      dailyActivity,
    });
  } catch (error) {
    console.error("Failed to fetch analytics:", error);
    return NextResponse.json({ error: "Failed to fetch analytics" }, { status: 500 });
  }
}
