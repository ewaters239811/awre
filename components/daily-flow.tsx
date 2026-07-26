"use client";

import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

type DailyFlowProps = {
  checkedIn: boolean;
  readToday: boolean;
  journaled: boolean;
};

const steps = [
  { key: "checkedIn", label: "Check in", href: "/check-in" },
  { key: "readToday", label: "Read", href: "/review" },
  { key: "journaled", label: "Journal", href: "/ritual" },
] as const;

export function DailyFlow({
  checkedIn,
  readToday,
  journaled,
}: DailyFlowProps) {
  const state = { checkedIn, readToday, journaled };
  const completedSteps = steps.filter((step) => state[step.key]).length;

  return (
    <section className="rounded-[1.35rem] border border-border/42 bg-card/20 p-4 sm:rounded-xl">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground sm:text-xs sm:tracking-[0.22em]">
          Daily Path
        </p>
        <p className="text-xs text-muted-foreground">
          {completedSteps} / {steps.length}
        </p>
      </div>
      <div className="mt-3 h-1 overflow-hidden rounded-full bg-muted/70">
        <div
          className="h-full rounded-full bg-primary transition-all duration-500"
          style={{ width: `${(completedSteps / steps.length) * 100}%` }}
        />
      </div>
      <div className="mt-4 grid grid-cols-3 gap-2">
        {steps.map((step, index) => {
          const complete = state[step.key];

          return (
            <Link
              key={step.key}
              href={step.href}
              className={cn(
                "rounded-2xl border px-2 py-3 text-xs transition sm:rounded-lg sm:px-3 sm:py-3 sm:text-sm",
                complete
                  ? "border-primary/35 bg-primary/10 text-foreground"
                  : "border-border/55 bg-background/24 text-muted-foreground hover:border-foreground/25 hover:text-foreground",
              )}
            >
              <span className="flex flex-col items-center justify-center gap-1 text-center leading-none sm:flex-row sm:justify-start sm:gap-2 sm:leading-normal">
                {complete ? (
                  <CheckCircle2 className="h-4 w-4 text-primary" aria-hidden />
                ) : (
                  <span className="flex h-4 w-4 items-center justify-center rounded-full border border-current text-[10px]">
                    {index + 1}
                  </span>
                )}
                {step.label}
              </span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
