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
    <section className="rounded-lg border border-border/70 bg-card/45 p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">
          Daily Flow
        </p>
        <p className="text-xs text-muted-foreground">
          {journaled ? "Done for today" : "One step at a time"}
        </p>
      </div>
      <div className="mt-4 grid grid-cols-3 gap-2">
        {steps.map((step, index) => {
          const complete = state[step.key];

          return (
            <Link
              key={step.key}
              href={step.href}
              className={cn(
                "rounded-md border px-3 py-3 text-sm transition",
                complete
                  ? "border-primary/35 bg-primary/10 text-foreground"
                  : "border-border bg-background/40 text-muted-foreground hover:border-foreground/30 hover:text-foreground",
              )}
            >
              <span className="flex items-center gap-2">
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
