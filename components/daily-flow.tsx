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

  return (
    <section className="rounded-2xl border border-border/65 bg-card/38 p-3 sm:rounded-xl sm:p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground sm:text-xs sm:tracking-[0.22em]">
          Today
        </p>
        <p className="text-xs text-muted-foreground">
          {journaled ? "Complete" : "Next step"}
        </p>
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2 sm:mt-4">
        {steps.map((step, index) => {
          const complete = state[step.key];

          return (
            <Link
              key={step.key}
              href={step.href}
              className={cn(
                "rounded-xl border px-2 py-2.5 text-xs transition sm:rounded-lg sm:px-3 sm:py-3 sm:text-sm",
                complete
                  ? "border-primary/35 bg-primary/10 text-foreground"
                  : "border-border bg-background/40 text-muted-foreground hover:border-foreground/30 hover:text-foreground",
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
