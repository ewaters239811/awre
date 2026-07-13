"use client";

import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";

export function ScoreSlider({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <div className="space-y-3 border-b border-border/50 py-5 last:border-b-0">
      <div className="flex items-center justify-between gap-4">
        <Label>{label}</Label>
        <span className="flex h-9 min-w-9 items-center justify-center rounded-md border border-border bg-foreground px-3 font-medium text-background">
          {value}
        </span>
      </div>
      <Slider
        value={[value]}
        min={1}
        max={10}
        step={1}
        onValueChange={(next) => onChange(next[0])}
        aria-label={label}
      />
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>Low alignment</span>
        <span>High alignment</span>
      </div>
    </div>
  );
}
