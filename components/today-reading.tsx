"use client";

import Link from "next/link";
import { Check, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getTodayReading } from "@/lib/today-reading";
import type { CheckInResult } from "@/lib/types";

export function TodayReading({
  result,
  loaded,
  status,
  onRetry,
  onRead,
  savingRead = false,
  error = "",
}: {
  result: CheckInResult | null;
  loaded: boolean;
  status: "idle" | "loading" | "ready" | "unavailable";
  onRetry: () => void;
  onRead: () => void;
  savingRead?: boolean;
  error?: string;
}) {
  if (loaded && !result)
    return (
      <section className="py-10 sm:py-12">
        <h2 className="font-serif text-2xl font-semibold">
          Your day starts here.
        </h2>
        <p className="mt-3 max-w-lg text-sm leading-7 text-muted-foreground">
          Check in and journal to see today&apos;s alignment and what it means
          for you.
        </p>
        <Button asChild className="mt-6">
          <Link href="/check-in">Check In</Link>
        </Button>
      </section>
    );
  const reading = result ? getTodayReading(result) : null;
  const waiting = !loaded || (!reading && status !== "unavailable");
  return (
    <div className="mt-8 sm:mt-10">
      <section
        aria-labelledby="today-gap-heading"
        className="grid gap-7 border-b border-border/45 pb-8 sm:grid-cols-[minmax(0,1fr)_10rem] sm:items-start sm:gap-10 sm:pb-10"
      >
        <div className="min-w-0">
          <h2
            id="today-gap-heading"
            className="text-xs uppercase tracking-[0.16em] text-primary"
          >
            The Gap Today
          </h2>
          {waiting ? (
            <ReadingSkeleton label="Preparing today's reflection" />
          ) : (
            <p className="mt-4 break-words font-serif text-2xl font-semibold leading-snug sm:text-3xl">
              {reading?.gap ?? "Your reflection isn't ready yet."}
            </p>
          )}
        </div>
        <div className="flex items-center justify-between gap-4 sm:block sm:border-l sm:border-border/45 sm:pl-7">
          <h2 className="text-xs text-muted-foreground">Alignment score</h2>
          <p
            className="whitespace-nowrap tabular-nums sm:mt-4"
            aria-label={
              result
                ? `Alignment score: ${result.beingScore.toFixed(1)} out of 10`
                : "Alignment score loading"
            }
          >
            <span className="font-serif text-5xl font-semibold leading-none text-primary sm:text-6xl">
              {result ? result.beingScore.toFixed(1) : "-"}
            </span>
            <span className="ml-2 text-sm text-muted-foreground">/ 10</span>
          </p>
        </div>
      </section>
      <section
        aria-labelledby="today-summary-heading"
        className="py-8 sm:py-10"
      >
        <h2
          id="today-summary-heading"
          className="font-serif text-xl font-semibold sm:text-2xl"
        >
          What&apos;s happening inside
        </h2>
        {waiting ? (
          <ReadingSkeleton label="Reading your check-in and journal" />
        ) : reading ? (
          <p className="mt-4 max-w-3xl break-words text-base leading-8 text-foreground/85">
            {reading.summary}
          </p>
        ) : (
          <p className="mt-4 text-sm leading-7 text-muted-foreground">
            We couldn&apos;t finish your reflection. Your check-in and journal
            are still saved.
          </p>
        )}
        {reading ? (
          <div className="mt-6 flex flex-wrap items-center gap-4">
            <Button
              type="button"
              variant="secondary"
              disabled={Boolean(result?.readAt) || savingRead}
              onClick={onRead}
            >
              <Check className="h-4 w-4" aria-hidden />
              {result?.readAt
                ? "Read"
                : savingRead
                  ? "Saving..."
                  : "I've read this"}
            </Button>
            <p className="text-xs leading-6 text-muted-foreground">
              A reflection of today, not a measure of your worth.
            </p>
          </div>
        ) : null}
        {status === "unavailable" && loaded ? (
          <div className="mt-5">
            {reading ? (
              <p role="status" className="mb-3 text-sm text-muted-foreground">
                We couldn&apos;t update this reflection.
              </p>
            ) : null}
            <Button type="button" variant="secondary" onClick={onRetry}>
              <RotateCcw className="h-4 w-4" aria-hidden />
              Try Again
            </Button>
          </div>
        ) : null}
        {error ? (
          <p role="alert" className="mt-4 text-sm text-primary">
            {error}
          </p>
        ) : null}
      </section>
    </div>
  );
}

function ReadingSkeleton({ label }: { label: string }) {
  return (
    <div role="status" className="mt-5 space-y-3 motion-safe:animate-pulse">
      <span className="sr-only">{label}</span>
      <div className="h-4 w-full rounded bg-muted/70" />
      <div className="h-4 w-5/6 rounded bg-muted/70" />
      <div className="h-4 w-2/3 rounded bg-muted/70" />
    </div>
  );
}
