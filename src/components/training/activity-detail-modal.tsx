"use client";

import { Clock, Repeat, Lightbulb, ListChecks, Target, Info } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { ActivityDetail } from "@/lib/training/activity-details";

interface ActivityDetailModalProps {
  activity: ActivityDetail | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ActivityDetailModal({
  activity,
  open,
  onOpenChange,
}: ActivityDetailModalProps) {
  if (!activity) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-xl">{activity.title}</DialogTitle>
          <DialogDescription>{activity.shortDescription}</DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 -mx-6 px-6">
          <div className="space-y-5 pb-4">
            {/* Purpose */}
            <section>
              <div className="flex items-center gap-2 mb-2">
                <Target className="h-4 w-4 text-primary" />
                <h3 className="font-semibold text-sm">Purpose</h3>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {activity.purpose}
              </p>
            </section>

            {/* Duration & Frequency */}
            <section className="flex gap-4">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">{activity.duration}</span>
              </div>
              <div className="flex items-center gap-2">
                <Repeat className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">{activity.frequency}</span>
              </div>
            </section>

            {/* Prerequisites */}
            {activity.prerequisites && activity.prerequisites.length > 0 && (
              <section>
                <div className="flex items-center gap-2 mb-2">
                  <Info className="h-4 w-4 text-amber-500" />
                  <h3 className="font-semibold text-sm">Prerequisites</h3>
                </div>
                <div className="flex flex-wrap gap-2">
                  {activity.prerequisites.map((prereq) => (
                    <Badge key={prereq} variant="outline" className="text-xs">
                      {prereq}
                    </Badge>
                  ))}
                </div>
              </section>
            )}

            {/* Steps */}
            <section>
              <div className="flex items-center gap-2 mb-3">
                <ListChecks className="h-4 w-4 text-primary" />
                <h3 className="font-semibold text-sm">How to Do It</h3>
              </div>
              <ol className="space-y-2">
                {activity.steps.map((step, index) => (
                  <li key={index} className="flex gap-3 text-sm">
                    <span className="flex-shrink-0 w-5 h-5 rounded-full bg-primary/10 text-primary text-xs flex items-center justify-center font-medium">
                      {index + 1}
                    </span>
                    <span className="text-muted-foreground leading-relaxed">
                      {step}
                    </span>
                  </li>
                ))}
              </ol>
            </section>

            {/* Tips */}
            <section>
              <div className="flex items-center gap-2 mb-3">
                <Lightbulb className="h-4 w-4 text-amber-500" />
                <h3 className="font-semibold text-sm">Tips</h3>
              </div>
              <ul className="space-y-2">
                {activity.tips.map((tip, index) => (
                  <li
                    key={index}
                    className="flex gap-2 text-sm text-muted-foreground"
                  >
                    <span className="text-amber-500">•</span>
                    <span className="leading-relaxed">{tip}</span>
                  </li>
                ))}
              </ul>
            </section>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
