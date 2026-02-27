"use client";

import { useEffect, useState, useCallback } from "react";
import { Header } from "@/components/layout/header";
import { BottomNav } from "@/components/layout/bottom-nav";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
  LineChart,
  Line,
} from "recharts";
import { formatResponseTime } from "@/lib/utils";

interface CommandStats {
  commandId: string;
  word: string;
  sequence: string;
  parentFamily: string;
  family: string | null;
  totalAttempts: number;
  positiveCount: number;
  negativeCount: number;
  avgResponseTimeMs: number | null;
  successRate: number;
}

interface OverallStats {
  totalRecords: number;
  positiveCount: number;
  negativeCount: number;
  avgResponseTimeMs: number | null;
  uniqueCommands: number;
  uniqueSessions: number;
}

interface DailyActivity {
  date: string;
  totalRecords: number;
  positiveCount: number;
  negativeCount: number;
}

interface AnalyticsData {
  overall: OverallStats;
  commandStats: CommandStats[];
  dailyActivity: DailyActivity[];
}

const DATE_RANGES = [
  { value: "7", label: "Last 7 days" },
  { value: "30", label: "Last 30 days" },
  { value: "90", label: "Last 90 days" },
  { value: "all", label: "All time" },
];

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [dateRange, setDateRange] = useState("30");

  const fetchAnalytics = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      
      if (dateRange !== "all") {
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - parseInt(dateRange));
        params.set("startDate", startDate.toISOString());
      }

      const response = await fetch(`/api/analytics?${params}`);
      if (response.ok) {
        const result = await response.json();
        setData(result);
      }
    } catch (error) {
      console.error("Failed to fetch analytics:", error);
    } finally {
      setIsLoading(false);
    }
  }, [dateRange]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  const successRate = data?.overall
    ? Math.round(
        (data.overall.positiveCount / Math.max(data.overall.totalRecords, 1)) * 100
      )
    : 0;

  return (
    <div className="min-h-screen pb-20">
      <Header />

      <main className="p-4 max-w-lg mx-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Analytics</h2>
          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {DATE_RANGES.map((range) => (
                <SelectItem key={range.value} value={range.value}>
                  {range.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-muted-foreground">Loading analytics...</div>
          </div>
        ) : !data || data.overall.totalRecords === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-center">
            <p className="text-muted-foreground mb-2">No training data yet</p>
            <p className="text-sm text-muted-foreground">
              Start a training session to track your progress.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Overall Stats */}
            <div className="grid grid-cols-2 gap-3">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Success Rate
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{successRate}%</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Avg Response
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {data.overall.avgResponseTimeMs
                      ? formatResponseTime(data.overall.avgResponseTimeMs)
                      : "-"}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Total Attempts
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{data.overall.totalRecords}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Sessions
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{data.overall.uniqueSessions}</div>
                </CardContent>
              </Card>
            </div>

            {/* Command Mastery Chart */}
            {data.commandStats.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-medium">Command Mastery</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={data.commandStats.slice(0, 10)}
                        layout="vertical"
                        margin={{ top: 5, right: 20, left: 60, bottom: 5 }}
                      >
                        <XAxis type="number" domain={[0, "dataMax"]} />
                        <YAxis
                          type="category"
                          dataKey="word"
                          width={55}
                          tick={{ fontSize: 12 }}
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "hsl(var(--card))",
                            border: "1px solid hsl(var(--border))",
                            borderRadius: "8px",
                          }}
                        />
                        <Legend />
                        <Bar
                          dataKey="positiveCount"
                          name="Positive"
                          fill="hsl(142.1, 76.2%, 36.3%)"
                          stackId="a"
                        />
                        <Bar
                          dataKey="negativeCount"
                          name="Negative"
                          fill="hsl(0, 84.2%, 60.2%)"
                          stackId="a"
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Daily Activity Chart */}
            {data.dailyActivity.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-medium">Daily Activity</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-48">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart
                        data={data.dailyActivity}
                        margin={{ top: 5, right: 20, left: 0, bottom: 5 }}
                      >
                        <XAxis
                          dataKey="date"
                          tick={{ fontSize: 10 }}
                          tickFormatter={(value) => {
                            const date = new Date(value);
                            return `${date.getMonth() + 1}/${date.getDate()}`;
                          }}
                        />
                        <YAxis tick={{ fontSize: 10 }} />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "hsl(var(--card))",
                            border: "1px solid hsl(var(--border))",
                            borderRadius: "8px",
                          }}
                          labelFormatter={(value) => {
                            const date = new Date(value);
                            return date.toLocaleDateString();
                          }}
                        />
                        <Line
                          type="monotone"
                          dataKey="totalRecords"
                          name="Total"
                          stroke="hsl(var(--primary))"
                          strokeWidth={2}
                          dot={false}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Command Details */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">Command Details</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {data.commandStats.map((cmd) => (
                    <div
                      key={cmd.commandId}
                      className="flex items-center justify-between p-2 rounded bg-muted/50"
                    >
                      <div>
                        <div className="font-medium text-sm">{cmd.word}</div>
                        <div className="text-xs text-muted-foreground">
                          {cmd.totalAttempts} attempts
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-medium text-sm">
                          {cmd.successRate || 0}%
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {cmd.avgResponseTimeMs
                            ? formatResponseTime(cmd.avgResponseTimeMs)
                            : "-"}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </main>

      <BottomNav />
    </div>
  );
}
