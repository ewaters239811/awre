"use client";

import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { useId } from "react";

export function ScoreSlider({
  label,
  description,
  value,
  onChange,
  disabled,
}: {
  label: string;
  description?: string;
  value: number;
  onChange: (value: number) => void;
  disabled?: boolean;
}) {
  const id = useId();
  return (
    <div className="space-y-3">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <Label htmlFor={id} className="text-base leading-6">
            {label}
          </Label>
          {description ? (
            <p
              id={`${id}-help`}
              className="mt-1 text-sm leading-6 text-muted-foreground"
            >
              {description}
            </p>
          ) : null}
        </div>
        <span
          aria-hidden
          className="shrink-0 pt-0.5 text-lg font-medium tabular-nums text-primary"
        >
          {value}
          <span className="text-xs text-muted-foreground"> / 10</span>
        </span>
      </div>
      <Slider
        id={id}
        value={[value]}
        min={1}
        max={10}
        step={1}
        disabled={disabled}
        onValueChange={(next) => onChange(next[0])}
        aria-label={label}
        aria-describedby={description ? `${id}-help` : undefined}
      />
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>Less aligned</span>
        <span>Fully aligned</span>
      </div>
    </div>
  );
}
