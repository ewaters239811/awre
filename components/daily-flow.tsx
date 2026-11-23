"use client";

import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

type DailyFlowProps = {
  checkedIn: boolean;
  readToday: boolean;
  meditated: boolean;
  interactive?: boolean;
};

const steps = [
  { key: "checkedIn", label: "Check in", href: "/check-in" },
  { key: "readToday", label: "Read", href: "/review" },
  { key: "meditated", label: "Tune In", href: "/tune-in" },
] as const;

export function DailyFlow({
  checkedIn,
  readToday,
  meditated,
  interactive = true,
}: DailyFlowProps) {
  const state = { checkedIn, readToday, meditated };
  const completedSteps = steps.filter((step) => state[step.key]).length;
  const nextStep = steps.findIndex((step) => !state[step.key]);

  return (
    <section className="aura-playful-ring rounded-[1.35rem] border border-border/42 bg-card/24 p-4 sm:rounded-xl">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground sm:text-xs sm:tracking-[0.22em]">
          Daily Path
        </p>
        <p className="text-xs text-muted-foreground">
          {completedSteps} / {steps.length}
        </p>
      </div>
      <div
        className="mt-3 h-1 overflow-hidden rounded-full bg-muted/70"
        role="progressbar"
        aria-label="Daily Path"
        aria-valuemin={0}
        aria-valuemax={steps.length}
        aria-valuenow={completedSteps}
        aria-valuetext={`${completedSteps} of ${steps.length} complete`}
      >
        <div
          className="clearpth-path-progress h-full rounded-full bg-primary transition-all duration-500"
          style={{ width: `${(completedSteps / steps.length) * 100}%` }}
        />
      </div>
      <ol className="mt-4 grid grid-cols-3 gap-2">
        {steps.map((step, index) => {
          const complete = state[step.key];
          const className = cn(
            "clearpth-daily-step block min-h-12 rounded-2xl border px-2 py-3 text-xs transition sm:rounded-lg sm:px-3 sm:py-3 sm:text-sm",
            complete
              ? "border-primary/35 bg-primary/10 text-foreground shadow-[0_8px_20px_rgba(0,0,0,0.16)]"
              : "border-border/55 bg-background/24 text-muted-foreground",
            interactive &&
              "hover:border-foreground/25 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            !complete && index === nextStep && "border-primary/35 text-foreground/85",
          );
          const content = (
            <span className="flex flex-col items-center justify-center gap-1 text-center leading-none sm:flex-row sm:justify-start sm:gap-2 sm:leading-normal">
              {complete ? (
                <CheckCircle2 className="h-4 w-4 text-primary" aria-hidden />
              ) : (
                <span className="flex h-4 w-4 items-center justify-center rounded-full border border-current text-[10px]">
                  {index + 1}
                </span>
              )}
              {step.label}
              <span className="sr-only">
                {complete ? ", complete" : index === nextStep ? ", next" : ""}
              </span>
            </span>
          );
          return (
            <li key={step.key} aria-current={index === nextStep ? "step" : undefined}>
              {interactive ? (
                <Link href={step.href} className={className}>
                  {content}
                </Link>
              ) : (
                <span className={className}>{content}</span>
              )}
            </li>
          );
        })}
      </ol>
    </section>
  );
}
