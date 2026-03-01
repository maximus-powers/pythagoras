"use client";

import { useEffect, useState, useCallback } from "react";
import { Dog, Calendar, Settings2, Save } from "lucide-react";
import { Header } from "@/components/layout/header";
import { BottomNav } from "@/components/layout/bottom-nav";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { toast } from "sonner";
import { useAppStore } from "@/lib/store";
import { SimulationPanel } from "@/components/simulation/simulation-panel";

interface DogProfile {
  id: string;
  name: string;
  nickname: string | null;
  breed: string | null;
  birthDate: string;
  arrivalDate: string;
  developmentalInfo: {
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
  };
  formattedAge: string;
}

interface TrainingSettings {
  id: string;
  aggressiveness: number;
  weeklyTrainingHours: string;
  sessionsPerDay: number;
  minutesPerSession: number;
  trainingDaysPerWeek: number;
}

const AGGRESSIVENESS_LABELS: Record<number, { label: string; description: string }> = {
  1: { label: "Relaxed", description: "95% accuracy across 5+ sessions" },
  2: { label: "Moderate", description: "90% accuracy across 4+ sessions" },
  3: { label: "Standard", description: "85% accuracy across 3+ sessions" },
  4: { label: "Accelerated", description: "80% accuracy across 2+ sessions" },
  5: { label: "Elite", description: "80% accuracy in novel environments" },
};

export default function ProfilePage() {
  const [profile, setProfile] = useState<DogProfile | null>(null);
  const [settings, setSettings] = useState<TrainingSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showSimPanel, setShowSimPanel] = useState(false);

  // Local state for editing
  const [localAggressiveness, setLocalAggressiveness] = useState(3);
  const [localWeeklyHours, setLocalWeeklyHours] = useState(5);
  const [localSessionsPerDay, setLocalSessionsPerDay] = useState(3);
  const [localMinutesPerSession, setLocalMinutesPerSession] = useState(8);
  const [localTrainingDays, setLocalTrainingDays] = useState(6);
  
  const { simulationEnabled, simulatedDate } = useAppStore();

  const fetchData = useCallback(async () => {
    try {
      // Build URL with simulation date if enabled
      const simParam = simulationEnabled && simulatedDate 
        ? `?asOf=${encodeURIComponent(simulatedDate)}` 
        : "";
      
      const [profileRes, settingsRes] = await Promise.all([
        fetch(`/api/dog${simParam}`),
        fetch("/api/training/settings"),
      ]);

      if (profileRes.ok) {
        const profileData = await profileRes.json();
        setProfile(profileData);
      }

      if (settingsRes.ok) {
        const settingsData = await settingsRes.json();
        setSettings(settingsData);
        setLocalAggressiveness(settingsData.aggressiveness);
        setLocalWeeklyHours(parseFloat(settingsData.weeklyTrainingHours));
        setLocalSessionsPerDay(settingsData.sessionsPerDay);
        setLocalMinutesPerSession(settingsData.minutesPerSession);
        setLocalTrainingDays(settingsData.trainingDaysPerWeek);
      }
    } catch (error) {
      console.error("Failed to fetch data:", error);
      toast.error("Failed to load profile");
    } finally {
      setIsLoading(false);
    }
  }, [simulationEnabled, simulatedDate]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSaveSettings = async () => {
    setIsSaving(true);
    try {
      const response = await fetch("/api/training/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          aggressiveness: localAggressiveness,
          weeklyTrainingHours: localWeeklyHours.toFixed(1),
          sessionsPerDay: localSessionsPerDay,
          minutesPerSession: localMinutesPerSession,
          trainingDaysPerWeek: localTrainingDays,
        }),
      });

      if (response.ok) {
        toast.success("Settings saved");
        fetchData();
      } else {
        toast.error("Failed to save settings");
      }
    } catch (error) {
      console.error("Failed to save settings:", error);
      toast.error("Failed to save settings");
    } finally {
      setIsSaving(false);
    }
  };

  const hasChanges = settings && (
    localAggressiveness !== settings.aggressiveness ||
    localWeeklyHours !== parseFloat(settings.weeklyTrainingHours) ||
    localSessionsPerDay !== settings.sessionsPerDay ||
    localMinutesPerSession !== settings.minutesPerSession ||
    localTrainingDays !== settings.trainingDaysPerWeek
  );

  return (
    <div className="min-h-screen pb-20">
      <Header />

      <main className="p-4 max-w-lg mx-auto space-y-4">
        {/* Simulation Panel */}
        <SimulationPanel 
          expanded={showSimPanel} 
          onToggle={() => setShowSimPanel(!showSimPanel)}
          onDataGenerated={fetchData}
        />
        
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-muted-foreground">Loading profile...</div>
          </div>
        ) : (
          <>
            {/* Dog Profile Card */}
            {profile && (
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                      <Dog className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <CardTitle>
                        {profile.name}
                        {profile.nickname && (
                          <span className="text-muted-foreground font-normal"> ({profile.nickname})</span>
                        )}
                      </CardTitle>
                      <CardDescription>
                        {profile.breed} {profile.formattedAge}
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <Label className="text-muted-foreground">Birth Date</Label>
                      <p>{new Date(profile.birthDate).toLocaleDateString()}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Arrival Date</Label>
                      <p>{new Date(profile.arrivalDate).toLocaleDateString()}</p>
                    </div>
                  </div>

                  <div className="pt-2 border-t">
                    <Label className="text-muted-foreground">Current Stage</Label>
                    <p className="font-medium">{profile.developmentalInfo.stageLabel}</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      {profile.developmentalInfo.stageDescription}
                    </p>
                  </div>

                  {!profile.developmentalInfo.isArrived && profile.developmentalInfo.daysUntilArrival && (
                    <div className="flex items-center gap-2 p-3 rounded-lg bg-blue-500/10 border border-blue-500/30">
                      <Calendar className="h-5 w-5 text-blue-500" />
                      <span className="text-sm">
                        Arrives in {profile.developmentalInfo.daysUntilArrival} days
                      </span>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Training Settings Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Settings2 className="h-5 w-5" />
                  Training Settings
                </CardTitle>
                <CardDescription>
                  Adjust how aggressively the training plan pushes progression
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Aggressiveness */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label>Aggressiveness</Label>
                    <span className="text-sm font-medium">
                      {AGGRESSIVENESS_LABELS[localAggressiveness].label}
                    </span>
                  </div>
                  <Slider
                    value={[localAggressiveness]}
                    onValueChange={([value]) => setLocalAggressiveness(value)}
                    min={1}
                    max={5}
                    step={1}
                  />
                  <p className="text-xs text-muted-foreground">
                    {AGGRESSIVENESS_LABELS[localAggressiveness].description}
                  </p>
                </div>

                {/* Weekly Hours */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label>Weekly Training Hours</Label>
                    <span className="text-sm text-muted-foreground">{localWeeklyHours} hrs</span>
                  </div>
                  <Slider
                    value={[localWeeklyHours]}
                    onValueChange={([value]) => setLocalWeeklyHours(value)}
                    min={2}
                    max={10}
                    step={0.5}
                  />
                </div>

                {/* Sessions Per Day */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label>Sessions Per Day</Label>
                    <span className="text-sm text-muted-foreground">{localSessionsPerDay}</span>
                  </div>
                  <Slider
                    value={[localSessionsPerDay]}
                    onValueChange={([value]) => setLocalSessionsPerDay(value)}
                    min={2}
                    max={6}
                    step={1}
                  />
                </div>

                {/* Minutes Per Session */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label>Minutes Per Session</Label>
                    <span className="text-sm text-muted-foreground">{localMinutesPerSession} min</span>
                  </div>
                  <Slider
                    value={[localMinutesPerSession]}
                    onValueChange={([value]) => setLocalMinutesPerSession(value)}
                    min={3}
                    max={20}
                    step={1}
                  />
                </div>

                {/* Training Days Per Week */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label>Training Days Per Week</Label>
                    <span className="text-sm text-muted-foreground">{localTrainingDays} days</span>
                  </div>
                  <Slider
                    value={[localTrainingDays]}
                    onValueChange={([value]) => setLocalTrainingDays(value)}
                    min={3}
                    max={7}
                    step={1}
                  />
                </div>

                {/* Save Button */}
                {hasChanges && (
                  <Button
                    onClick={handleSaveSettings}
                    disabled={isSaving}
                    className="w-full"
                  >
                    <Save className="h-4 w-4 mr-2" />
                    {isSaving ? "Saving..." : "Save Settings"}
                  </Button>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </main>

      <BottomNav />
    </div>
  );
}
