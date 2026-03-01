"use client";

import { useEffect, useState, useCallback } from "react";
import { AlertTriangle, CheckCircle2, Circle, Clock, Dog, Calendar, ChevronDown, ChevronRight, Info, Play, Timer, Target } from "lucide-react";
import { Header } from "@/components/layout/header";
import { BottomNav } from "@/components/layout/bottom-nav";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/lib/store";
import { SimulationPanel } from "@/components/simulation/simulation-panel";
import { ActivityDetailModal } from "@/components/training/activity-detail-modal";
import { getActivityDetails, type ActivityDetail } from "@/lib/training/activity-details";
import { SequenceDisplayInline } from "@/components/ui/sequence-display";

// Session activity type
interface SessionActivity {
  name: string;
  description: string;
  durationMinutes: number;
  objectives: string[];
  tips?: string[];
}

// Session goal type
interface SessionGoal {
  id: string;
  track: "t1_sessions";
  goalType: "session";
  title: string;
  description: string;
  sessionType: string;
  sessionId: string;
  objectives: string[];
  activities: SessionActivity[];
  totalDuration: number;
  targetValue: { completed: number };
  currentValue: { completed: number };
  status: string;
  sortOrder: number;
  dayOfWeek?: number;
}

// Socialization goal type
interface SocializationGoal {
  id: string;
  track: "t2_socialization";
  goalType: "socialization_item";
  title: string;
  description: string;
  targetValue: { exposures: number; avgScore: number };
  currentValue: { exposures: number; avgScore: number; scores: number[] };
  status: string;
  socializationItemId: string;
  sortOrder: number;
  isCarryOver?: boolean;
  originalWeek?: number;
}

// Communication goal type
interface CommunicationGoal {
  id: string;
  track: "t3_communication";
  goalType: "exposure_count";
  title: string;
  description: string;
  sequence: string; // The sound sequence (e.g., "__..")
  discriminationSet: string;
  discriminationSetLabel: string;
  trainingContext?: string;
  isFoundationMarker: boolean;
  targetValue: { count: number };
  currentValue: { count: number };
  status: string;
  commandId: string;
  sortOrder: number;
}

// Union type for all goals
type TrainingGoal = SessionGoal | SocializationGoal | CommunicationGoal;

interface TrackProgress {
  track: string;
  label: string;
  currentPhase: string;
  completedGoals: number;
  totalGoals: number;
}

interface DevelopmentalInfo {
  ageWeeks: number;
  stage: string;
  stageLabel: string;
  stageDescription: string;
  fearPeriod: {
    active: boolean;
    period: number | null;
    description: string;
  };
  socializationWindow: string;
  daysUntilArrival: number | null;
  isArrived: boolean;
}

interface WeeklyUnit {
  weekNumber: number;
  startDate: string;
  endDate: string;
  dogAgeWeeks: number;
  developmentalInfo: DevelopmentalInfo;
  effectiveAggressiveness: number;
  isPreArrival: boolean;
  goals: TrainingGoal[];
  trackProgress: TrackProgress[];
  isCurrent: boolean;
  isPast: boolean;
  isFuture: boolean;
}

interface TrainingPlan {
  units: WeeklyUnit[];
  currentWeekNumber: number;
  dogName: string;
  dogNickname: string;
  simulatedDate: string | null;
}

interface Milestone {
  id: string;
  category: string;
  name: string;
  description: string;
  targetAgeWeeks: number | null;
  status: string;
}

interface SocializationStats {
  totalItems: number;
  totalScored: number;
  totalMastered: number;
}

const TRACK_COLORS: Record<string, string> = {
  t1_sessions: "bg-blue-500",
  t2_socialization: "bg-green-500",
  t3_communication: "bg-purple-500",
};

const TRACK_LABELS: Record<string, string> = {
  t1_sessions: "Sessions",
  t2_socialization: "Socialization",
  t3_communication: "Communication",
};

const SESSION_TYPE_COLORS: Record<string, string> = {
  skill: "bg-blue-500",
  impulse: "bg-orange-500",
  play: "bg-pink-500",
  enrichment: "bg-purple-500",
  outing: "bg-green-500",
};

const SESSION_TYPE_LABELS: Record<string, string> = {
  skill: "Skill",
  impulse: "Impulse",
  play: "Play",
  enrichment: "Enrichment",
  outing: "Outing",
};

const DAY_LABELS = ["", "Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

// Developmental stage labels for week groupings
function getStageForWeek(ageWeeks: number): { name: string; description: string } {
  if (ageWeeks < 8) return { name: "Pre-Arrival", description: "Preparing for puppy" };
  if (ageWeeks <= 12) return { name: "Critical Socialization", description: "8-12 weeks - Maximum exposure" };
  if (ageWeeks <= 16) return { name: "Socialization Window", description: "12-16 weeks - Continue exposure, fear period possible" };
  if (ageWeeks <= 24) return { name: "Juvenile", description: "4-6 months - Formal training begins" };
  if (ageWeeks <= 36) return { name: "Adolescence", description: "6-9 months - Testing boundaries" };
  if (ageWeeks <= 52) return { name: "Young Adult", description: "9-12 months - Proofing & reliability" };
  if (ageWeeks <= 78) return { name: "Maturity", description: "12-18 months - Advanced training" };
  return { name: "Adult", description: "18+ months - Maintenance & specialization" };
}

function SocializationScorer({
  exposures,
  avgScore,
  scores,
  targetExposures,
  targetAvgScore,
  onScore,
  isMastered,
  isSimulationMode,
  isReadOnly,
}: {
  exposures: number;
  avgScore: number;
  scores: number[];
  targetExposures: number;
  targetAvgScore: number;
  onScore: (score: number) => Promise<void> | void;
  isMastered: boolean;
  isSimulationMode?: boolean;
  isReadOnly?: boolean;
}) {
  const [isScoring, setIsScoring] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  const handleScore = async (score: number) => {
    setIsSaving(true);
    try {
      await onScore(score);
    } finally {
      setIsSaving(false);
      setIsScoring(false);
    }
  };
  
  const avgColor = avgScore >= 4 ? "text-green-500" : avgScore >= 3 ? "text-yellow-500" : avgScore > 0 ? "text-red-500" : "text-muted-foreground";
  
  return (
    <div className="mt-2 space-y-2">
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground">Exposures:</span>
          <div className="flex gap-1">
            {Array.from({ length: targetExposures }).map((_, i) => (
              <div
                key={i}
                className={cn(
                  "w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold",
                  i < scores.length
                    ? scores[i] >= 4
                      ? "bg-green-500 text-white"
                      : scores[i] >= 3
                      ? "bg-yellow-500 text-white"
                      : "bg-red-500 text-white"
                    : "bg-muted text-muted-foreground"
                )}
              >
                {i < scores.length ? scores[i] : ""}
              </div>
            ))}
          </div>
        </div>
        <div className={cn("font-medium", avgColor)}>
          {exposures > 0 ? `Avg: ${avgScore}` : "No scores yet"}
        </div>
      </div>
      
      {!isMastered && !isReadOnly && (
        isSimulationMode ? (
          <p className="text-xs text-muted-foreground italic">
            Scoring disabled in simulation mode
          </p>
        ) : isScoring ? (
          <div className="flex items-center gap-1">
            <span className="text-xs text-muted-foreground mr-1">Score:</span>
            {[1, 2, 3, 4, 5].map((score) => (
              <Button
                key={score}
                variant="outline"
                size="sm"
                disabled={isSaving}
                className={cn(
                  "w-8 h-8 p-0",
                  score <= 2 && "hover:bg-red-500 hover:text-white hover:border-red-500",
                  score === 3 && "hover:bg-yellow-500 hover:text-white hover:border-yellow-500",
                  score >= 4 && "hover:bg-green-500 hover:text-white hover:border-green-500"
                )}
                onClick={() => handleScore(score)}
              >
                {score}
              </Button>
            ))}
            <Button
              variant="ghost"
              size="sm"
              className="ml-1 text-xs"
              disabled={isSaving}
              onClick={() => setIsScoring(false)}
            >
              {isSaving ? "Saving..." : "Cancel"}
            </Button>
          </div>
        ) : (
          <Button
            variant="outline"
            size="sm"
            className="w-full"
            onClick={() => setIsScoring(true)}
          >
            + Add Exposure
          </Button>
        )
      )}
      
      {isMastered && (
        <div className="flex items-center gap-1 text-xs text-green-500">
          <CheckCircle2 className="h-3 w-3" />
          <span>Mastered this week</span>
        </div>
      )}
    </div>
  );
}

// Session card for displaying training sessions
function SessionCard({
  goal,
  onComplete,
  isSimulationMode,
  isReadOnly,
}: {
  goal: SessionGoal;
  onComplete: (goalId: string) => void;
  isSimulationMode?: boolean;
  isReadOnly?: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const isCompleted = goal.status === "completed";
  
  const sessionColor = SESSION_TYPE_COLORS[goal.sessionType] || "bg-gray-500";
  const sessionLabel = SESSION_TYPE_LABELS[goal.sessionType] || goal.sessionType;
  const dayLabel = goal.dayOfWeek ? DAY_LABELS[goal.dayOfWeek] : "";
  
  return (
    <div
      className={cn(
        "p-3 rounded-lg border",
        isCompleted
          ? "bg-green-500/10 border-green-500/30"
          : "bg-muted/50 border-border"
      )}
    >
      <div className="flex items-start gap-3">
        <div className="shrink-0 mt-0.5">
          {isCompleted ? (
            <CheckCircle2 className="h-5 w-5 text-green-500" />
          ) : isReadOnly ? (
            <Circle className="h-5 w-5 text-muted-foreground/50" />
          ) : (
            <button
              onClick={() => onComplete(goal.id)}
              className="h-5 w-5 rounded border-2 border-muted-foreground/50 hover:border-primary hover:bg-primary/10 transition-colors"
              aria-label="Mark as done"
            />
          )}
        </div>
        
        <div className="flex-1 min-w-0">
          {/* Header with badges */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setExpanded(!expanded)}
              className={cn(
                "font-medium text-sm text-left flex items-center gap-1.5 hover:text-primary transition-colors",
                isCompleted && "line-through text-muted-foreground"
              )}
            >
              {goal.title}
              {expanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
            </button>
            <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0", sessionColor, "text-white border-0")}>
              {sessionLabel}
            </Badge>
            {dayLabel && (
              <span className="text-[10px] text-muted-foreground">{dayLabel}</span>
            )}
          </div>
          
          {/* Duration and objectives */}
          <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Timer className="h-3 w-3" />
              {goal.totalDuration} min
            </span>
            {goal.objectives.length > 0 && (
              <span className="flex items-center gap-1">
                <Target className="h-3 w-3" />
                {goal.objectives.slice(0, 2).map((o) => o.replace("_", " ")).join(", ")}
                {goal.objectives.length > 2 && ` +${goal.objectives.length - 2}`}
              </span>
            )}
          </div>
          
          {/* Description */}
          {!expanded && (
            <p className="text-sm text-muted-foreground mt-1 line-clamp-1">
              {goal.description}
            </p>
          )}
          
          {/* Expanded activities */}
          {expanded && (
            <div className="mt-3 space-y-3">
              <p className="text-sm text-muted-foreground">{goal.description}</p>
              
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Activities:</p>
                {goal.activities.map((activity, i) => (
                  <div key={i} className="pl-3 border-l-2 border-muted">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium">{activity.name}</p>
                      <span className="text-xs text-muted-foreground">{activity.durationMinutes} min</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">{activity.description}</p>
                    {activity.tips && activity.tips.length > 0 && (
                      <ul className="mt-1 text-xs text-muted-foreground list-disc list-inside">
                        {activity.tips.slice(0, 2).map((tip, j) => (
                          <li key={j}>{tip}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Communication goal card - handles foundation markers and regular words
function CommunicationGoalCard({
  goal,
  isReadOnly,
}: {
  goal: CommunicationGoal;
  isReadOnly?: boolean;
}) {
  const isCompleted = goal.status === "completed";
  const isFoundationMarker = goal.isFoundationMarker;
  const targetCount = goal.targetValue.count;
  const currentCount = goal.currentValue.count || 0;
  
  return (
    <div
      className={cn(
        "p-2 rounded border",
        isCompleted
          ? "bg-green-500/10 border-green-500/30"
          : isFoundationMarker
          ? "bg-blue-500/5 border-blue-500/20"
          : "bg-muted/30 border-border"
      )}
    >
      <div className="flex items-center gap-2 flex-wrap">
        <span className={cn(
          "font-medium text-sm",
          isCompleted && "text-muted-foreground"
        )}>
          {goal.title}
        </span>
        <SequenceDisplayInline sequence={goal.sequence} className="shrink-0" />
        {goal.trainingContext && (
          <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4">
            {goal.trainingContext === "recall" ? "recall" : "name"}
          </Badge>
        )}
        {isFoundationMarker && (
          <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 bg-blue-500/10 border-blue-500/30 text-blue-600">
            ongoing
          </Badge>
        )}
      </div>
      
      {isFoundationMarker ? (
        <p className="text-xs text-muted-foreground mt-1">
          {goal.description}
        </p>
      ) : !isCompleted && (
        <div className="mt-1.5">
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-0.5">
            <span>{isReadOnly ? "Target" : "Progress"}</span>
            <span>{currentCount}/{targetCount}</span>
          </div>
          <Progress
            value={(currentCount / targetCount) * 100}
            className="h-1.5"
          />
        </div>
      )}
    </div>
  );
}

// Discrimination set group - collapsible group of related communication goals
function DiscriminationSetGroup({
  setId,
  label,
  goals,
  defaultOpen = true,
  isReadOnly,
}: {
  setId: string;
  label: string;
  goals: CommunicationGoal[];
  defaultOpen?: boolean;
  isReadOnly?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const completed = goals.filter(g => g.status === "completed").length;
  const hasFoundationMarkers = goals.some(g => g.isFoundationMarker);
  const total = goals.filter(g => !g.isFoundationMarker).length;
  const completedNonFoundation = goals.filter(g => !g.isFoundationMarker && g.status === "completed").length;
  
  return (
    <div className="border rounded-lg overflow-hidden">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-2 hover:bg-muted/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          {isOpen ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
          <span className="text-sm font-medium">{label}</span>
          {hasFoundationMarkers && (
            <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 bg-blue-500/10 border-blue-500/30 text-blue-600">
              foundation
            </Badge>
          )}
        </div>
        {total > 0 && (
          <span className="text-xs text-muted-foreground">
            {completedNonFoundation}/{total}
          </span>
        )}
      </button>
      
      {isOpen && (
        <div className="p-2 pt-0 space-y-1.5 border-t">
          {goals.map(goal => (
            <CommunicationGoalCard
              key={goal.id}
              goal={goal}
              isReadOnly={isReadOnly}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// Socialization goal card
function SocializationGoalCard({
  goal,
  onScoreSocialization,
  isSimulationMode,
  isReadOnly,
}: {
  goal: SocializationGoal;
  onScoreSocialization: (itemId: string, score: number) => void;
  isSimulationMode?: boolean;
  isReadOnly?: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const isCompleted = goal.status === "completed";
  
  return (
    <div
      className={cn(
        "p-3 rounded-lg border",
        isCompleted
          ? "bg-green-500/10 border-green-500/30"
          : "bg-muted/50 border-border"
      )}
    >
      <div className="flex items-start gap-3">
        <Circle className="h-5 w-5 text-muted-foreground/50 shrink-0 mt-0.5" />
        
        <div className="flex-1 min-w-0">
          <p className={cn(
            "font-medium text-sm",
            isCompleted && "line-through text-muted-foreground"
          )}>
            {goal.title}
          </p>
          
          {goal.description && (
            <div className="mt-1">
              {goal.description.length > 100 && !expanded ? (
                <button 
                  onClick={() => setExpanded(true)}
                  className="text-left"
                >
                  <p className="text-sm text-muted-foreground">
                    {goal.description.slice(0, 100)}...
                    <span className="text-primary ml-1">more</span>
                  </p>
                </button>
              ) : (
                <p className="text-sm text-muted-foreground">
                  {goal.description}
                  {goal.description.length > 100 && (
                    <button 
                      onClick={() => setExpanded(false)}
                      className="text-primary ml-1"
                    >
                      less
                    </button>
                  )}
                </p>
              )}
            </div>
          )}

          <SocializationScorer
              exposures={goal.currentValue.exposures || 0}
              avgScore={goal.currentValue.avgScore || 0}
              scores={Array.isArray(goal.currentValue.scores) ? goal.currentValue.scores : []}
              targetExposures={goal.targetValue.exposures || 3}
              targetAvgScore={goal.targetValue.avgScore || 4}
              onScore={(score) => onScoreSocialization(goal.socializationItemId, score)}
              isMastered={isCompleted}
              isSimulationMode={isSimulationMode}
              isReadOnly={isReadOnly}
            />
        </div>
      </div>
    </div>
  );
}

function WeekCard({
  unit,
  isExpanded,
  onToggle,
  onCompleteGoal,
  onScoreSocialization,
  isSimulationMode,
}: {
  unit: WeeklyUnit;
  isExpanded: boolean;
  onToggle: () => void;
  onCompleteGoal: (goalId: string, targetCount?: number) => void;
  onScoreSocialization: (itemId: string, score: number) => void;
  isSimulationMode: boolean;
}) {
  const stage = getStageForWeek(unit.dogAgeWeeks);
  const goalsByTrack = unit.goals.reduce((acc, goal) => {
    if (!acc[goal.track]) acc[goal.track] = [];
    acc[goal.track].push(goal);
    return acc;
  }, {} as Record<string, TrainingGoal[]>);

  const completedGoals = unit.goals.filter(g => g.status === "completed").length;
  const totalGoals = unit.goals.length;

  return (
    <Card className={cn(
      unit.isCurrent && "ring-2 ring-primary",
      unit.isPast && "opacity-60"
    )}>
      <CardHeader className="pb-2 cursor-pointer" onClick={onToggle}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                Week {unit.weekNumber}
                {unit.isCurrent && <Badge className="text-xs">Current</Badge>}
                {unit.developmentalInfo.fearPeriod.active && (
                  <Badge variant="outline" className="text-xs text-yellow-600 border-yellow-600">
                    Fear Period
                  </Badge>
                )}
              </CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                {unit.dogAgeWeeks} weeks old - {stage.name}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {totalGoals > 0 && (
              <Badge variant="outline" className="text-xs">
                {completedGoals}/{totalGoals}
              </Badge>
            )}
            {unit.isPast && completedGoals === totalGoals && totalGoals > 0 && (
              <CheckCircle2 className="h-5 w-5 text-green-500" />
            )}
          </div>
        </div>
      </CardHeader>

      {isExpanded && (
        <CardContent className="pt-2 space-y-4">
          {unit.developmentalInfo.fearPeriod.active && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/30">
              <AlertTriangle className="h-5 w-5 text-yellow-500 shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-sm text-yellow-600 dark:text-yellow-400">
                  Fear Period {unit.developmentalInfo.fearPeriod.period} Active
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Aggressiveness reduced. Prioritize confidence building.
                </p>
              </div>
            </div>
          )}

          {/* Goals by track */}
          {Object.entries(goalsByTrack).map(([track, goals]) => {
            const completed = goals.filter(g => g.status === "completed").length;
            const total = goals.length;
            
            // Sort goals: incomplete first, completed at bottom
            // For sessions, also group by day
            const sortedGoals = [...goals].sort((a, b) => {
              const aCompleted = a.status === "completed" ? 1 : 0;
              const bCompleted = b.status === "completed" ? 1 : 0;
              if (aCompleted !== bCompleted) return aCompleted - bCompleted;
              
              // For sessions, sort by day of week
              if (a.goalType === "session" && b.goalType === "session") {
                const aDay = (a as SessionGoal).dayOfWeek || 0;
                const bDay = (b as SessionGoal).dayOfWeek || 0;
                if (aDay !== bDay) return aDay - bDay;
              }
              
              return a.sortOrder - b.sortOrder;
            });
            
            // For sessions track, group by day
            const isSessionsTrack = track === "t1_sessions";
            
            return (
            <div key={track} className="space-y-2">
              <div className="flex items-center gap-2">
                <div className={cn("w-2 h-2 rounded-full", TRACK_COLORS[track] || "bg-gray-500")} />
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  {TRACK_LABELS[track] || track}
                </h4>
                <span className="text-xs text-muted-foreground">
                  {completed}/{total}
                </span>
                <Progress
                  value={total > 0 ? (completed / total) * 100 : 0}
                  className="w-12 h-1.5"
                />
              </div>
              
              {isSessionsTrack ? (
                // Sessions: group by day of week
                <div className="space-y-3">
                  {Array.from({ length: 7 }, (_, i) => i + 1).map((day) => {
                    const dayGoals = sortedGoals.filter(
                      (g) => g.goalType === "session" && (g as SessionGoal).dayOfWeek === day
                    ) as SessionGoal[];
                    
                    if (dayGoals.length === 0) return null;
                    
                    return (
                      <div key={day} className="space-y-2">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-medium text-muted-foreground w-8">
                            {DAY_LABELS[day]}
                          </span>
                          <div className="flex-1 h-px bg-border" />
                        </div>
                        <div className={cn(
                          "space-y-2 pl-2",
                          dayGoals.length > 4 && "max-h-[300px] overflow-y-auto pr-1"
                        )}>
                          {dayGoals.map((goal) => (
                            <SessionCard
                              key={goal.id}
                              goal={goal}
                              onComplete={onCompleteGoal}
                              isSimulationMode={isSimulationMode}
                              isReadOnly={unit.isFuture}
                            />
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : track === "t3_communication" ? (
                // Communication: group by discrimination set
                (() => {
                  const commGoals = sortedGoals as CommunicationGoal[];
                  // Group by discrimination set, maintaining order
                  const setOrder: string[] = [];
                  const goalsBySet: Record<string, CommunicationGoal[]> = {};
                  
                  for (const goal of commGoals) {
                    const setId = goal.discriminationSet || "other";
                    if (!goalsBySet[setId]) {
                      goalsBySet[setId] = [];
                      setOrder.push(setId);
                    }
                    goalsBySet[setId].push(goal);
                  }
                  
                  return (
                    <div className={cn(
                      "space-y-2",
                      Object.keys(goalsBySet).length > 4 && "max-h-[500px] overflow-y-auto pr-1"
                    )}>
                      {setOrder.map((setId) => (
                        <DiscriminationSetGroup
                          key={setId}
                          setId={setId}
                          label={goalsBySet[setId][0]?.discriminationSetLabel || setId}
                          goals={goalsBySet[setId]}
                          defaultOpen={true}
                          isReadOnly={unit.isFuture}
                        />
                      ))}
                    </div>
                  );
                })()
              ) : (
                // Socialization: regular list
                <div className={cn(
                  "space-y-2",
                  goals.length > 3 && "max-h-[400px] overflow-y-auto pr-1"
                )}>
                  {sortedGoals.map((goal) => (
                    <SocializationGoalCard
                      key={goal.id}
                      goal={goal as SocializationGoal}
                      onScoreSocialization={onScoreSocialization}
                      isSimulationMode={isSimulationMode}
                      isReadOnly={unit.isFuture}
                    />
                  ))}
                </div>
              )}
            </div>
            );
          })}

          {totalGoals === 0 && (
            <p className="text-sm text-muted-foreground italic">
              No specific goals for this week
            </p>
          )}
        </CardContent>
      )}
    </Card>
  );
}

export default function TrainingPlanPage() {
  const [plan, setPlan] = useState<TrainingPlan | null>(null);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [socializationStats, setSocializationStats] = useState<SocializationStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedWeeks, setExpandedWeeks] = useState<Set<number>>(new Set());
  const [showSimPanel, setShowSimPanel] = useState(false);
  
  const { simulationEnabled, simulatedDate } = useAppStore();

  const fetchData = useCallback(async () => {
    try {
      const simParam = simulationEnabled && simulatedDate 
        ? `?asOf=${encodeURIComponent(simulatedDate)}` 
        : "";
      
      const [planRes, milestonesRes, socRes] = await Promise.all([
        fetch(`/api/training/plan${simParam}`),
        fetch("/api/milestones"),
        fetch("/api/socialization"),
      ]);

      if (planRes.ok) {
        const data = await planRes.json();
        setPlan(data);
        // Auto-expand current week
        setExpandedWeeks(new Set([data.currentWeekNumber]));
      }

      if (milestonesRes.ok) {
        const data = await milestonesRes.json();
        setMilestones(data.milestones || []);
      }

      if (socRes.ok) {
        const data = await socRes.json();
        setSocializationStats({
          totalItems: data.totalItems,
          totalScored: data.totalScored,
          totalMastered: data.totalMastered,
        });
      }
    } catch (error) {
      console.error("Failed to fetch data:", error);
      toast.error("Failed to load training plan");
    } finally {
      setIsLoading(false);
    }
  }, [simulationEnabled, simulatedDate]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleCompleteGoal = async (goalId: string, targetCount?: number) => {
    const currentUnit = plan?.units.find(u => u.isCurrent);
    const goal = currentUnit?.goals.find((g) => g.id === goalId);
    if (!goal) return;

    // Handle different goal types for targetCount
    let goalTargetCount = targetCount || 1;
    if (!targetCount) {
      if (goal.goalType === "session") {
        goalTargetCount = (goal as SessionGoal).targetValue.completed || 1;
      } else if (goal.goalType === "exposure_count") {
        goalTargetCount = (goal as CommunicationGoal).targetValue.count || 1;
      }
    }

    try {
      const response = await fetch("/api/training/goals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          goalKey: goal.id,
          track: goal.track,
          goalType: goal.goalType,
          title: goal.title,
          targetCount: goalTargetCount,
        }),
      });

      if (response.ok) {
        const result = await response.json();
        if (result.isComplete) {
          toast.success(`${goal.title} complete!`);
        } else if (result.instanceNumber) {
          toast.success(`${goal.title} (${result.instanceNumber}/${result.totalInstances})`);
        } else {
          toast.success("Done!");
        }
        fetchData();
      } else {
        const responseText = await response.text();
        let errorMessage = `Status ${response.status}`;
        try {
          const errorData = JSON.parse(responseText);
          errorMessage = errorData.error || errorData.details || errorMessage;
        } catch {
          errorMessage = responseText || errorMessage;
        }
        toast.error(`Failed: ${errorMessage}`);
      }
    } catch (error) {
      console.error("Failed to complete goal:", error);
      toast.error("Failed to complete goal");
    }
  };

  const handleScoreSocialization = async (itemId: string, score: number) => {
    if (simulationEnabled) {
      toast.error("Cannot add scores in simulation mode");
      return;
    }
    
    try {
      const response = await fetch("/api/socialization", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemId, score }),
      });

      if (response.ok) {
        toast.success(`Scored ${score}/5`);
        await fetchData();
      } else {
        toast.error("Failed to save score");
      }
    } catch (error) {
      console.error("Failed to score socialization:", error);
      toast.error("Failed to save score");
    }
  };

  const toggleWeek = (weekNumber: number) => {
    setExpandedWeeks((prev) => {
      const next = new Set(prev);
      if (next.has(weekNumber)) {
        next.delete(weekNumber);
      } else {
        next.add(weekNumber);
      }
      return next;
    });
  };

  const currentUnit = plan?.units.find(u => u.isCurrent);

  return (
    <div className="min-h-screen pb-20">
      <Header />

      <main className="p-4 max-w-lg mx-auto space-y-4">
        <SimulationPanel 
          expanded={showSimPanel} 
          onToggle={() => setShowSimPanel(!showSimPanel)}
          onDataGenerated={fetchData}
        />
        
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-muted-foreground">Loading training plan...</div>
          </div>
        ) : !plan ? (
          <Card>
            <CardContent className="p-6 text-center">
              <p className="text-muted-foreground">
                No training plan available. Please set up your dog profile.
              </p>
            </CardContent>
          </Card>
        ) : currentUnit?.isPreArrival ? (
          <>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Dog className="h-5 w-5" />
                  {plan.dogNickname || plan.dogName} arrives soon!
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-3 p-4 rounded-lg bg-blue-500/10 border border-blue-500/30">
                  <Calendar className="h-8 w-8 text-blue-500" />
                  <div>
                    <p className="font-semibold text-lg">
                      {currentUnit.developmentalInfo.daysUntilArrival} days until arrival
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {plan.dogNickname || plan.dogName} will be 8 weeks old
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <h2 className="text-lg font-semibold pt-2">Training Plan Preview</h2>
            <p className="text-sm text-muted-foreground -mt-2">
              What training will look like once {plan.dogNickname || plan.dogName} arrives
            </p>

            {/* Skip week 0 (pre-arrival) since it's shown in the countdown card above */}
            {plan.units.filter(u => u.weekNumber > 0).map((unit) => (
              <WeekCard
                key={unit.weekNumber}
                unit={unit}
                isExpanded={expandedWeeks.has(unit.weekNumber)}
                onToggle={() => toggleWeek(unit.weekNumber)}
                onCompleteGoal={handleCompleteGoal}
                onScoreSocialization={handleScoreSocialization}
                isSimulationMode={simulationEnabled}
              />
            ))}
          </>
        ) : (
          <>
            {/* Current Status Header */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">
                    Week {currentUnit?.weekNumber} Training Plan
                  </CardTitle>
                  <span className="text-sm text-muted-foreground">
                    {plan.dogNickname || plan.dogName} is {currentUnit?.dogAgeWeeks} weeks old
                  </span>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="text-sm">
                  <span className="font-medium">{currentUnit?.developmentalInfo.stageLabel}</span>
                </div>

                {currentUnit?.developmentalInfo.fearPeriod.active && (
                  <div className="flex items-start gap-2 p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/30">
                    <AlertTriangle className="h-5 w-5 text-yellow-500 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium text-sm text-yellow-600 dark:text-yellow-400">
                        Fear Period {currentUnit.developmentalInfo.fearPeriod.period} Active
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Aggressiveness reduced to {currentUnit.effectiveAggressiveness}. Prioritize confidence.
                      </p>
                    </div>
                  </div>
                )}

                {/* Quick Stats */}
                <div className="grid grid-cols-3 gap-2 pt-2">
                  <div className="text-center p-2 rounded-lg bg-muted/50">
                    <p className="text-2xl font-bold text-blue-500">
                      {currentUnit?.trackProgress.find((t) => t.track === "t1_sessions")?.currentPhase?.replace("phase_", "").toUpperCase() || "A"}
                    </p>
                    <p className="text-xs text-muted-foreground">Training Phase</p>
                  </div>
                  <div className="text-center p-2 rounded-lg bg-muted/50">
                    <p className="text-2xl font-bold text-green-500">
                      {socializationStats?.totalMastered || 0}/{socializationStats?.totalItems || 50}
                    </p>
                    <p className="text-xs text-muted-foreground">Socialization</p>
                  </div>
                  <div className="text-center p-2 rounded-lg bg-muted/50">
                    <p className="text-2xl font-bold text-purple-500">
                      {milestones.filter((m) => m.status === "completed").length}/{milestones.length}
                    </p>
                    <p className="text-xs text-muted-foreground">Milestones</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Full Training Plan */}
            <h2 className="text-lg font-semibold pt-2">Full Training Plan</h2>
            <p className="text-sm text-muted-foreground -mt-2">
              {plan.units.filter(u => !u.isPast).length} weeks remaining
            </p>

            {plan.units.map((unit) => (
              <WeekCard
                key={unit.weekNumber}
                unit={unit}
                isExpanded={expandedWeeks.has(unit.weekNumber)}
                onToggle={() => toggleWeek(unit.weekNumber)}
                onCompleteGoal={handleCompleteGoal}
                onScoreSocialization={handleScoreSocialization}
                isSimulationMode={simulationEnabled}
              />
            ))}
          </>
        )}
      </main>

      <BottomNav />
    </div>
  );
}
