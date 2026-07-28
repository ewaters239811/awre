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
    <div className="group space-y-3 rounded-[1.1rem] border border-border/35 bg-background/18 px-3.5 py-4 transition hover:border-primary/24 hover:bg-card/28 sm:px-4 sm:py-5">
      <div className="flex items-start justify-between gap-4">
        <Label className="max-w-[78%] leading-6">{label}</Label>
        <span className="flex h-11 min-w-11 items-center justify-center rounded-2xl border border-primary/30 bg-[linear-gradient(135deg,#f4efe4,#d8be84)] px-3 text-lg font-semibold leading-none text-background shadow-[0_8px_20px_rgba(0,0,0,0.24)] transition group-hover:scale-105">
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
        <span>Far off</span>
        <span>Close</span>
      </div>
    </div>
  );
}
