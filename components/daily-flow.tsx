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
    <section className="rounded-xl border border-border/70 bg-card/45 p-3 sm:p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">
          Daily Flow
        </p>
        <p className="text-xs text-muted-foreground">
          {journaled ? "Done for today" : "One step at a time"}
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
                "rounded-lg border px-2 py-3 text-xs transition sm:px-3 sm:text-sm",
                complete
                  ? "border-primary/35 bg-primary/10 text-foreground"
                  : "border-border bg-background/40 text-muted-foreground hover:border-foreground/30 hover:text-foreground",
              )}
            >
              <span className="flex flex-col items-center justify-center gap-1 text-center sm:flex-row sm:justify-start sm:gap-2">
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
