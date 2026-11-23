"use client";

import Link from "next/link";
import { useEffect, useId, useState } from "react";
import { ArrowRight, ChevronDown } from "lucide-react";
import { getCheckInById, updateCheckIn } from "@/lib/alignment";
import { getJournalEntries } from "@/lib/journal-storage";
import { getCheckIns } from "@/lib/alignment";
import { getOnboardingProfile } from "@/lib/onboarding-storage";
import { saveCheckInToAccount } from "@/lib/account-data";
import {
  buildHomeAlignmentContext,
  cleanHomeGap,
  cleanHomeGapEvidence,
  fallbackHomeGap,
} from "@/lib/home-alignment";
import type { HomeAlignmentContext } from "@/lib/home-alignment";
import type { HomeGapEvidence } from "@/lib/types";

export function HomeGapNote({ context }: { context: HomeAlignmentContext }) {
  const serialized = JSON.stringify(context);
  const detailsId = useId();
  const [expanded, setExpanded] = useState(false);
  const [reading, setReading] = useState<{
    signature: string;
    statement: string;
    evidence?: HomeGapEvidence[];
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
        setReading({
          signature: input.signature,
          statement: cached.statement,
          evidence: cleanHomeGapEvidence(cached.evidence, input),
        }),
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
        const evidence = statement
          ? cleanHomeGapEvidence(payload.evidence, input)
          : [];
        setReading({
          signature: input.signature,
          statement: statement ?? fallbackHomeGap(input),
          evidence,
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
            evidence,
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
  const evidence =
    reading?.signature === context.signature ? reading.evidence ?? [] : [];
  const recentJournal = context.journals[0];
  const recentCheckIn = context.reflections[0];
  const recentWriting =
    recentJournal?.content || recentCheckIn?.checkInJournal || recentCheckIn?.thought;
  const recentExcerpt =
    recentWriting && recentWriting.length > 180
      ? `${recentWriting.slice(0, 180).replace(/\s+\S*$/, "")}...`
      : recentWriting;
  const formatDate = (value: string) => {
    const date = new Date(value.length === 10 ? `${value}T12:00:00` : value);
    return Number.isNaN(date.getTime())
      ? "Saved reflection"
      : date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  };
  return (
    <div className="mx-auto mt-6 min-h-[5rem] max-w-lg text-center sm:mt-8">
      {statement ? (
        <>
          <button
            type="button"
            className="w-full rounded-md px-1 py-2 outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-expanded={expanded}
            aria-controls={detailsId}
            onClick={() => setExpanded((value) => !value)}
            title="About this reflection"
          >
            <span className="flex items-center justify-center gap-1.5 text-[11px] uppercase tracking-[0.18em] text-primary/80">
              The Current Gap
              <ChevronDown
                className={`h-3.5 w-3.5 transition-transform ${expanded ? "rotate-180" : ""}`}
                aria-hidden
              />
            </span>
            <span className="mt-3 block text-[17px] leading-8 text-foreground/85 sm:text-xl sm:leading-8" aria-live="polite">
              {statement}
            </span>
          </button>
          <div
            id={detailsId}
            hidden={!expanded}
            className="mt-3 border-t border-border/50 pt-4 text-left text-sm leading-6 text-muted-foreground"
          >
            {context.checkInCount > 0 ? (
              <>
                <p>
                  Drawn from {context.checkInCount} {context.checkInCount === 1 ? "check-in" : "check-ins"} and {context.journalCount} {context.journalCount === 1 ? "journal entry" : "journal entries"} for your desired reality.
                </p>
                {(evidence.length > 0 || recentExcerpt) && (
                  <p className="mb-2 mt-3 text-xs">
                    {evidence.length ? "In your words" : "Your recent writing"}
                  </p>
                )}
                {evidence.length > 0 ? (
                  evidence.map((item) => {
                    const source =
                      item.source === "journal"
                        ? context.journals.find((entry) => entry.id === item.sourceId)
                        : context.reflections.find((entry) => entry.id === item.sourceId);
                    return (
                      <blockquote
                        key={`${item.source}-${item.sourceId}`}
                        className="mb-3 border-l border-primary/35 pl-3"
                      >
                        <p className="break-words text-foreground/85">
                          &ldquo;{item.excerpt}&rdquo;
                        </p>
                        <footer className="mt-1 text-xs">
                          {source ? formatDate(source.date) : "Saved reflection"}
                        </footer>
                      </blockquote>
                    );
                  })
                ) : recentExcerpt ? (
                  <blockquote className="mb-3 border-l border-primary/35 pl-3">
                    <p className="break-words text-foreground/85">&ldquo;{recentExcerpt}&rdquo;</p>
                  </blockquote>
                ) : null}
                <p className="text-xs">
                  A perspective to consider, not a conclusion about who you are.
                </p>
                <Link
                  href="/dashboard"
                  className="mt-2 inline-flex min-h-11 items-center gap-1.5 text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  Explore your patterns
                  <ArrowRight className="h-3.5 w-3.5" aria-hidden />
                </Link>
              </>
            ) : (
              <p>
                Your check-ins and writing will help this reflection become more personal.
                There is no gap to assume before you begin.
              </p>
            )}
          </div>
        </>
      ) : (
        <>
          <p className="text-[11px] uppercase tracking-[0.18em] text-primary/80">
            The Current Gap
          </p>
          <div
            className="mx-auto mt-4 space-y-2"
            role="status"
            aria-label="Reflecting on your patterns"
          >
            <div className="mx-auto h-3 w-5/6 animate-pulse rounded-full bg-muted" />
            <div className="mx-auto h-3 w-2/3 animate-pulse rounded-full bg-muted" />
          </div>
        </>
      )}
    </div>
  );
}
