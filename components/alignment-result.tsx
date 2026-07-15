import Link from "next/link";
import { ArrowRight, Compass, Flame, RotateCcw, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { CheckInResult } from "@/lib/types";

export function AlignmentResult({
  result,
  aiStatus = "idle",
}: {
  result: CheckInResult;
  aiStatus?: "idle" | "loading" | "ready" | "unavailable";
}) {
  const isWaitingForPersonalizedResult =
    !result.aiAlignment && (aiStatus === "idle" || aiStatus === "loading");
  const activePrescription = result.aiAlignment ?? result.prescription;
  const signature = buildBeingSignature(result);
  const prescription: Array<[string, string]> = [
    ["Thought correction", activePrescription.thoughtCorrection],
    ["Action step", activePrescription.actionStep],
    ["Feeling practice", activePrescription.embodimentPractice],
    ["Identity affirmation", activePrescription.identityAffirmation],
  ];

  return (
    <section className="mx-auto max-w-5xl">
      <div className="aura-glass rounded-2xl p-5 md:rounded-lg md:p-8">
        <div className="text-center">
          <p className="text-[11px] uppercase tracking-[0.18em] text-primary md:text-sm md:tracking-[0.28em]">
            Today&apos;s Result
          </p>
          <div className="mt-5 flex items-end justify-center gap-3 md:mt-6">
            <span className="font-serif text-6xl font-semibold leading-none text-primary sm:text-9xl">
              {result.beingScore}
            </span>
            <span className="pb-4 text-xl text-muted-foreground">/ 10</span>
          </div>
          <h1 className="mt-3 font-serif text-3xl font-semibold leading-tight sm:text-5xl">
            {result.stateLabel}
          </h1>
          <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-muted-foreground md:mt-4 md:text-base">
            {signature}
          </p>
          <AiStatus status={aiStatus} hasAi={Boolean(result.aiAlignment)} />
        </div>

        <div className="aura-luxury-line my-8" />

        <div className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr] lg:gap-6">
          <aside className="space-y-3 md:space-y-4">
            <article className="rounded-2xl border border-primary/25 bg-primary/10 p-4 md:rounded-md md:p-5">
              <div className="flex items-center gap-3">
                <Sparkles className="h-5 w-5 text-primary" aria-hidden />
                <p className="text-[11px] uppercase tracking-[0.16em] text-primary md:text-xs md:tracking-[0.22em]">
                  State Signal
                </p>
              </div>
              <div className="mt-5 grid gap-3 text-sm">
                <Stat label="Strongest pillar" value={result.strongestPillar} />
                <Stat label="Weakest pillar" value={result.weakestPillar} />
                <Stat label="State signal" value={result.stateLabel} />
              </div>
            </article>

            {result.aiAlignment?.summary ? (
              <article className="rounded-2xl border border-border/55 bg-card/55 p-4 md:rounded-md md:p-5">
                <div className="flex items-center gap-3">
                  <Compass className="h-5 w-5 text-primary" aria-hidden />
                  <p className="text-[11px] uppercase tracking-[0.16em] text-primary md:text-xs md:tracking-[0.22em]">
                    Reading
                  </p>
                </div>
                <p className="mt-3 text-sm leading-6 text-muted-foreground md:text-base md:leading-7">
                  {result.aiAlignment.summary}
                </p>
              </article>
            ) : isWaitingForPersonalizedResult ? (
              <article className="rounded-2xl border border-border/55 bg-card/55 p-4 md:rounded-md md:p-5">
                <div className="flex items-center gap-3">
                  <Compass className="h-5 w-5 text-primary" aria-hidden />
                  <p className="text-[11px] uppercase tracking-[0.16em] text-primary md:text-xs md:tracking-[0.22em]">
                    Reading
                  </p>
                </div>
                <div className="mt-4 space-y-3">
                  <div className="h-3 w-5/6 animate-pulse rounded-full bg-muted" />
                  <div className="h-3 w-full animate-pulse rounded-full bg-muted" />
                  <div className="h-3 w-2/3 animate-pulse rounded-full bg-muted" />
                </div>
              </article>
            ) : null}
          </aside>

          <div className="grid gap-4">
            <div className="flex items-center gap-3">
              <Flame className="h-5 w-5 text-primary" aria-hidden />
              <h2 className="font-serif text-2xl font-semibold md:text-3xl">
                Your Next Alignment
              </h2>
            </div>
            {isWaitingForPersonalizedResult
              ? prescription.map(([label]) => (
                  <article
                    key={label}
                    className="rounded-2xl border border-border/55 bg-card/55 p-4 md:rounded-md md:p-5"
                  >
                    <p className="text-[11px] uppercase tracking-[0.16em] text-primary md:text-xs md:tracking-[0.22em]">
                      {label}
                    </p>
                    <div className="mt-4 space-y-3">
                      <div className="h-3 w-full animate-pulse rounded-full bg-muted" />
                      <div className="h-3 w-4/5 animate-pulse rounded-full bg-muted" />
                    </div>
                  </article>
                ))
              : prescription.map(([label, body]) => (
                  <article
                    key={label}
                    className="rounded-2xl border border-border/55 bg-card/55 p-4 md:rounded-md md:p-5"
                  >
                    <p className="text-[11px] uppercase tracking-[0.16em] text-primary md:text-xs md:tracking-[0.22em]">
                      {label}
                    </p>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground md:text-base md:leading-7">
                      {body}
                    </p>
                  </article>
                ))}
          </div>
        </div>
      </div>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <Button asChild>
          <Link href="/check-in">
            <RotateCcw className="h-4 w-4" aria-hidden />
            Check In
          </Link>
        </Button>
        <Button asChild variant="secondary">
          <Link href="/dashboard">
            View Patterns
            <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
        </Button>
      </div>
    </section>
  );
}

function buildBeingSignature(result: CheckInResult) {
  return `${result.strongestPillar} is carrying the signal today. ${result.weakestPillar} is the doorway back into fuller integration.`;
}

function AiStatus({
  status,
  hasAi,
}: {
  status: "idle" | "loading" | "ready" | "unavailable";
  hasAi: boolean;
}) {
  if (hasAi || status === "ready") {
    return (
      <p className="mt-4 rounded-md border border-primary/25 bg-primary/10 px-4 py-3 text-sm text-primary">
        Personalized alignment revealed.
      </p>
    );
  }

  if (status === "loading") {
    return (
      <p className="mt-4 rounded-md border border-border/70 bg-card/45 px-4 py-3 text-sm text-muted-foreground">
        Reading your alignment...
      </p>
    );
  }

  if (status === "idle" && !hasAi) {
    return (
      <p className="mt-4 rounded-md border border-border/70 bg-card/45 px-4 py-3 text-sm text-muted-foreground">
        Preparing your reading...
      </p>
    );
  }

  if (status === "unavailable") {
    return (
      <p className="mt-4 rounded-md border border-border/70 bg-card/45 px-4 py-3 text-sm text-muted-foreground">
        Showing your alignment result.
      </p>
    );
  }

  return null;
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-border/55 bg-card/55 px-3 py-3 md:rounded-md md:px-4">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium text-foreground">{value}</span>
    </div>
  );
}
