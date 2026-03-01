"use client";

import { useState } from "react";
import { FlaskConical, Calendar, ChevronDown, ChevronRight, RotateCcw, FastForward, Database, Trash2, Loader2 } from "lucide-react";
import { useAppStore } from "@/lib/store";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";

// Py's key dates
const PY_BIRTH_DATE = new Date("2026-01-18");
const PY_ARRIVAL_DATE = new Date("2026-03-14");

// Quick jump presets based on Py's developmental timeline
const DATE_PRESETS = [
  {
    label: "Today",
    description: "Current real date",
    getDate: () => new Date(),
  },
  {
    label: "Pre-Arrival",
    description: "1 week before arrival",
    getDate: () => new Date("2026-03-07"),
  },
  {
    label: "Arrival Day",
    description: "8 weeks old",
    getDate: () => new Date("2026-03-14"),
  },
  {
    label: "Week 2",
    description: "9 weeks, fear period 1",
    getDate: () => new Date("2026-03-21"),
  },
  {
    label: "Week 4",
    description: "11 weeks, end of fear 1",
    getDate: () => new Date("2026-04-11"),
  },
  {
    label: "Week 8",
    description: "16 weeks, socialization closing",
    getDate: () => new Date("2026-05-09"),
  },
  {
    label: "4 Months",
    description: "Formal Obedience begins",
    getDate: () => new Date("2026-05-18"),
  },
  {
    label: "6 Months",
    description: "Off-Leash Transition",
    getDate: () => new Date("2026-07-18"),
  },
  {
    label: "8 Months",
    description: "Fear period 2 window",
    getDate: () => new Date("2026-09-18"),
  },
  {
    label: "12 Months",
    description: "Real-World Proofing",
    getDate: () => new Date("2027-01-18"),
  },
  {
    label: "18 Months",
    description: "Elite phase begins",
    getDate: () => new Date("2027-07-18"),
  },
];

function formatDateForInput(date: Date): string {
  return date.toISOString().split("T")[0];
}

function getAgeFromDate(date: Date): string {
  const diffMs = date.getTime() - PY_BIRTH_DATE.getTime();
  const weeks = Math.floor(diffMs / (1000 * 60 * 60 * 24 * 7));
  
  if (weeks < 0) return "Not born yet";
  if (weeks < 8) return `${weeks} weeks (at breeder)`;
  if (weeks < 52) return `${weeks} weeks old`;
  
  const months = Math.floor(weeks / 4.33);
  if (months < 24) return `${months} months old`;
  
  const years = Math.floor(months / 12);
  return `${years} year${years > 1 ? "s" : ""} old`;
}

function getPhaseFromDate(date: Date): string {
  const diffMs = date.getTime() - PY_ARRIVAL_DATE.getTime();
  const weeks = Math.floor(diffMs / (1000 * 60 * 60 * 24 * 7)) + 1;
  
  if (weeks < 1) return "Pre-Arrival";
  if (weeks <= 8) return "Foundation & Socialization";
  if (weeks <= 16) return "Formal Obedience";
  if (weeks <= 36) return "Off-Leash Transition";
  if (weeks <= 52) return "Real-World Proofing";
  return "Elite & Maintenance";
}

interface SimulationPanelProps {
  expanded?: boolean;
  onToggle?: () => void;
  compact?: boolean;
  onDataGenerated?: () => void;
}

export function SimulationPanel({ expanded = true, onToggle, compact = false, onDataGenerated }: SimulationPanelProps) {
  const { 
    simulationEnabled, 
    simulatedDate, 
    setSimulationEnabled, 
    setSimulatedDate 
  } = useAppStore();
  
  const [isGenerating, setIsGenerating] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  
  const currentDate = simulatedDate ? new Date(simulatedDate) : new Date();
  
  const handleGenerateData = async () => {
    setIsGenerating(true);
    try {
      const response = await fetch("/api/simulation/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          upToDate: currentDate.toISOString(),
          clearExisting: true,
        }),
      });
      
      if (response.ok) {
        const data = await response.json();
        toast.success(
          `Generated ${data.generated.sessions} sessions, ${data.generated.records} records, ${data.generated.socializationScores} socialization scores`
        );
        onDataGenerated?.();
      } else {
        const error = await response.json();
        toast.error(error.error || "Failed to generate data");
      }
    } catch (error) {
      console.error("Failed to generate data:", error);
      toast.error("Failed to generate sample data");
    } finally {
      setIsGenerating(false);
    }
  };
  
  const handleClearData = async () => {
    setIsClearing(true);
    try {
      const response = await fetch("/api/simulation/generate", {
        method: "DELETE",
      });
      
      if (response.ok) {
        toast.success("All training data cleared");
        onDataGenerated?.();
      } else {
        toast.error("Failed to clear data");
      }
    } catch (error) {
      console.error("Failed to clear data:", error);
      toast.error("Failed to clear data");
    } finally {
      setIsClearing(false);
    }
  };
  
  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const date = new Date(e.target.value);
    setSimulatedDate(date.toISOString());
  };
  
  const handlePresetClick = (preset: typeof DATE_PRESETS[0]) => {
    const date = preset.getDate();
    setSimulatedDate(date.toISOString());
    if (!simulationEnabled) {
      setSimulationEnabled(true);
    }
  };
  
  const handleReset = () => {
    setSimulationEnabled(false);
    setSimulatedDate(null);
  };
  
  const jumpDays = (days: number) => {
    const newDate = new Date(currentDate);
    newDate.setDate(newDate.getDate() + days);
    setSimulatedDate(newDate.toISOString());
  };

  if (compact) {
    return (
      <div className="flex items-center gap-3 p-3 rounded-lg bg-purple-500/10 border border-purple-500/30">
        <FlaskConical className="h-5 w-5 text-purple-500" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-purple-400">Simulation Mode</p>
          <p className="text-xs text-muted-foreground truncate">
            {formatDateForInput(currentDate)} - {getAgeFromDate(currentDate)}
          </p>
        </div>
        <Button variant="ghost" size="sm" onClick={handleReset}>
          <RotateCcw className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  return (
    <Card className="border-purple-500/30">
      <CardHeader className="pb-3 cursor-pointer" onClick={onToggle}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {onToggle && (expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />)}
            <FlaskConical className="h-5 w-5 text-purple-500" />
            <CardTitle className="text-base">Simulation Mode</CardTitle>
            {simulationEnabled && (
              <Badge variant="outline" className="text-purple-500 border-purple-500">
                Active
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
            <Switch
              checked={simulationEnabled}
              onCheckedChange={setSimulationEnabled}
            />
          </div>
        </div>
        <CardDescription>
          Test how the training plan looks at different points in time
        </CardDescription>
      </CardHeader>

      {expanded && (
        <CardContent className="space-y-4">
          {/* Current simulated state */}
          {simulationEnabled && (
            <div className="p-3 rounded-lg bg-purple-500/10 border border-purple-500/30 space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Simulated Date</p>
                  <p className="text-2xl font-bold text-purple-400">
                    {currentDate.toLocaleDateString("en-US", { 
                      month: "short", 
                      day: "numeric", 
                      year: "numeric" 
                    })}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">Py's Age</p>
                  <p className="text-sm font-medium">{getAgeFromDate(currentDate)}</p>
                  <p className="text-xs text-muted-foreground mt-1">{getPhaseFromDate(currentDate)}</p>
                </div>
              </div>
              
              {/* Quick navigation */}
              <div className="flex items-center gap-2 pt-2 border-t border-purple-500/20">
                <Button variant="outline" size="sm" onClick={() => jumpDays(-7)}>
                  -1 week
                </Button>
                <Button variant="outline" size="sm" onClick={() => jumpDays(-1)}>
                  -1 day
                </Button>
                <Button variant="outline" size="sm" onClick={() => jumpDays(1)}>
                  +1 day
                </Button>
                <Button variant="outline" size="sm" onClick={() => jumpDays(7)}>
                  +1 week
                </Button>
                <Button variant="ghost" size="sm" onClick={handleReset}>
                  <RotateCcw className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {/* Date picker */}
          <div className="space-y-2">
            <Label htmlFor="sim-date">Jump to specific date</Label>
            <Input
              id="sim-date"
              type="date"
              value={formatDateForInput(currentDate)}
              onChange={handleDateChange}
              className="w-full"
            />
          </div>

          {/* Preset buttons */}
          <div className="space-y-2">
            <Label>Quick Jump to Milestone</Label>
            <div className="grid grid-cols-2 gap-2">
              {DATE_PRESETS.map((preset) => (
                <Button
                  key={preset.label}
                  variant="outline"
                  size="sm"
                  className="justify-start h-auto py-2"
                  onClick={() => handlePresetClick(preset)}
                >
                  <div className="text-left">
                    <p className="font-medium">{preset.label}</p>
                    <p className="text-xs text-muted-foreground">{preset.description}</p>
                  </div>
                </Button>
              ))}
            </div>
          </div>
          
          {/* Sample Data Generation */}
          {simulationEnabled && (
            <div className="space-y-2 pt-4 border-t">
              <Label>Sample Data</Label>
              <p className="text-xs text-muted-foreground">
                Generate realistic training data up to the simulated date to see how analytics and progress tracking would look.
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={handleGenerateData}
                  disabled={isGenerating || isClearing}
                >
                  {isGenerating ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Database className="h-4 w-4 mr-2" />
                  )}
                  Generate Data
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleClearData}
                  disabled={isGenerating || isClearing}
                  className="text-destructive hover:text-destructive"
                >
                  {isClearing ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}
