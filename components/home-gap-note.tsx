"use client";

import { useEffect, useState } from "react";
import { getCheckInById, updateCheckIn } from "@/lib/alignment";
import { getJournalEntries } from "@/lib/journal-storage";
import { getCheckIns } from "@/lib/alignment";
import { getOnboardingProfile } from "@/lib/onboarding-storage";
import { saveCheckInToAccount } from "@/lib/account-data";
import {
  buildHomeAlignmentContext,
  cleanHomeGap,
  fallbackHomeGap,
} from "@/lib/home-alignment";
import type { HomeAlignmentContext } from "@/lib/home-alignment";

export function HomeGapNote({ context }: { context: HomeAlignmentContext }) {
  const serialized = JSON.stringify(context);
  const [reading, setReading] = useState<{
    signature: string;
    statement: string;
  } | null>(null);
  useEffect(() => {
    const input: HomeAlignmentContext = JSON.parse(serialized);
    const cached = input.resultId
      ? getCheckInById(input.resultId)?.aiHomeGap
      : null;
    if (
      cached?.signature === input.signature &&
      cleanHomeGap(cached.statement)
    ) {
      queueMicrotask(() =>
        setReading({ signature: input.signature, statement: cached.statement }),
      );
      return;
    }
    if (!input.resultId || !input.goalId) {
      queueMicrotask(() =>
        setReading({
          signature: input.signature,
          statement: fallbackHomeGap(input),
        }),
      );
      return;
    }
    const controller = new AbortController();
    fetch("/api/alignment-note", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: serialized,
      signal: controller.signal,
    })
      .then((response) => response.json())
      .then(async (payload) => {
        if (controller.signal.aborted) return;
        const statement = payload.enabled
          ? cleanHomeGap(payload.statement)
          : null;
        setReading({
          signature: input.signature,
          statement: statement ?? fallbackHomeGap(input),
        });
        if (!statement) return;
        const current = buildHomeAlignmentContext(
          getCheckIns(input.goalId!),
          getJournalEntries(input.goalId!),
          getOnboardingProfile(),
        );
        const result = getCheckInById(input.resultId!);
        if (!result || current.signature !== input.signature) return;
        const next = {
          ...result,
          aiHomeGap: {
            signature: input.signature,
            statement,
            generatedAt: new Date().toISOString(),
          },
        };
        await saveCheckInToAccount(next);
        updateCheckIn(next);
      })
      .catch(() => {
        if (!controller.signal.aborted)
          setReading((current) =>
            current?.signature === input.signature
              ? current
              : {
                  signature: input.signature,
                  statement: fallbackHomeGap(input),
                },
          );
      });
    return () => controller.abort();
  }, [serialized]);

  const statement =
    reading?.signature === context.signature ? reading.statement : null;
  return (
    <div
      className="mx-auto mt-6 min-h-[5rem] max-w-lg text-center sm:mt-8"
      aria-live="polite"
    >
      <p className="text-[11px] uppercase tracking-[0.18em] text-primary/80">
        The Current Gap
      </p>
      {statement ? (
        <p className="mt-3 text-[17px] leading-8 text-foreground/85 sm:text-xl sm:leading-8">
          {statement}
        </p>
      ) : (
        <div
          className="mx-auto mt-4 space-y-2"
          role="status"
          aria-label="Reflecting on your patterns"
        >
          <div className="mx-auto h-3 w-5/6 animate-pulse rounded-full bg-muted" />
          <div className="mx-auto h-3 w-2/3 animate-pulse rounded-full bg-muted" />
        </div>
      )}
    </div>
  );
}
