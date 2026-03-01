"use client";

import { Volume2, Wind, Dog, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { useSoundEngine } from "@/hooks/use-sound-engine";
import { toast } from "sonner";
import type { SoundType } from "@/lib/audio/sound-engine";

const DEFAULT_CONFIG = {
  soundType: "beep" as SoundType,
  silenceDurationMs: 150,
  gapDurationMs: 100,
};

const SOUND_TYPES: { value: SoundType; icon: React.ReactNode; label: string }[] = [
  { value: "beep", icon: <Volume2 className="h-5 w-5" />, label: "Beep" },
  { value: "whistle", icon: <Wind className="h-5 w-5" />, label: "Whistle" },
  { value: "growl", icon: <Dog className="h-5 w-5" />, label: "Growl" },
];

interface QuickSettingsProps {
  isOpen: boolean;
}

export function QuickSettings({ isOpen }: QuickSettingsProps) {
  const { config, setConfig } = useSoundEngine();

  if (!isOpen) return null;

  return (
    <Card className="mx-4 mt-2 mb-4">
      <CardContent className="p-4 space-y-4">
        {/* Sound Type Selection */}
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">Sound Type</Label>
          <div className="grid grid-cols-3 gap-2">
            {SOUND_TYPES.map((type) => (
              <Button
                key={type.value}
                variant={config.soundType === type.value ? "default" : "outline"}
                size="sm"
                className="flex flex-col h-14 gap-1"
                onClick={() => setConfig({ soundType: type.value })}
              >
                {type.icon}
                <span className="text-xs">{type.label}</span>
              </Button>
            ))}
          </div>
        </div>

        {/* Silence Duration */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-xs text-muted-foreground">Silence "0"</Label>
            <span className="text-xs text-muted-foreground">{config.silenceDurationMs}ms</span>
          </div>
          <Slider
            value={[config.silenceDurationMs]}
            onValueChange={([value]) => setConfig({ silenceDurationMs: value })}
            min={50}
            max={500}
            step={10}
          />
        </div>

        {/* Gap Duration */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-xs text-muted-foreground">Gap between tones</Label>
            <span className="text-xs text-muted-foreground">{config.gapDurationMs}ms</span>
          </div>
          <Slider
            value={[config.gapDurationMs]}
            onValueChange={([value]) => setConfig({ gapDurationMs: value })}
            min={50}
            max={500}
            step={10}
          />
        </div>

        {/* Reset */}
        <Button
          variant="ghost"
          size="sm"
          className="w-full text-muted-foreground"
          onClick={() => {
            setConfig(DEFAULT_CONFIG);
            toast.success("Settings reset to defaults");
          }}
        >
          <RotateCcw className="h-4 w-4 mr-2" />
          Reset to defaults
        </Button>
      </CardContent>
    </Card>
  );
}
