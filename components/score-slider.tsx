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
    <div className="space-y-3 border-b border-border/50 py-4 last:border-b-0 sm:py-5">
      <div className="flex items-start justify-between gap-4">
        <Label className="max-w-[78%] leading-6">{label}</Label>
        <span className="flex h-10 min-w-10 items-center justify-center rounded-xl border border-border bg-foreground px-3 text-lg font-semibold leading-none text-background">
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
