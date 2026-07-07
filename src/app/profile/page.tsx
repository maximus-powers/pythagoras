"use client";

import { useEffect, useState } from "react";
import { Calendar, Dog } from "lucide-react";
import { Header } from "@/components/layout/header";
import { BottomNav } from "@/components/layout/bottom-nav";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";

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

export default function ProfilePage() {
  const [profile, setProfile] = useState<DogProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchProfile() {
      try {
        const response = await fetch("/api/dog");

        if (response.ok) {
          const profileData = await response.json();
          setProfile(profileData);
        }
      } catch (error) {
        console.error("Failed to fetch dog profile:", error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchProfile();
  }, []);

  return (
    <div className="min-h-screen pb-20">
      <Header />

      <main className="p-4 max-w-lg mx-auto space-y-4">
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-muted-foreground">Loading profile...</div>
          </div>
        ) : !profile ? (
          <div className="flex items-center justify-center h-64 text-center">
            <div className="text-muted-foreground">No dog profile found.</div>
          </div>
        ) : (
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
                    {[profile.breed, profile.formattedAge].filter(Boolean).join(" - ")}
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
      </main>

      <BottomNav />
    </div>
  );
}
