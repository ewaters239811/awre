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
  const activePrescription = result.aiAlignment ?? result.prescription;
  const signature = buildBeingSignature(result);
  const prescription = [
    ["Thought correction", activePrescription.thoughtCorrection],
    ["Action step", activePrescription.actionStep],
    ["Feeling practice", activePrescription.embodimentPractice],
    ["Identity affirmation", activePrescription.identityAffirmation],
  ];

  return (
    <section className="mx-auto max-w-5xl">
      <div className="aura-glass rounded-lg p-6 md:p-8">
        <div className="text-center">
          <p className="text-sm uppercase tracking-[0.28em] text-primary">
            Today&apos;s Result
          </p>
          <div className="mt-6 flex items-end justify-center gap-3">
            <span className="font-serif text-8xl font-semibold leading-none text-primary sm:text-9xl">
              {result.beingScore}
            </span>
            <span className="pb-4 text-xl text-muted-foreground">/ 10</span>
          </div>
          <h1 className="mt-3 font-serif text-4xl font-semibold leading-tight sm:text-5xl">
            {result.stateLabel}
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-muted-foreground">
            {signature}
          </p>
          <AiStatus status={aiStatus} hasAi={Boolean(result.aiAlignment)} />
        </div>

        <div className="aura-luxury-line my-8" />

        <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          <aside className="space-y-4">
            <article className="rounded-md border border-primary/25 bg-primary/10 p-5">
              <div className="flex items-center gap-3">
                <Sparkles className="h-5 w-5 text-primary" aria-hidden />
                <p className="text-xs uppercase tracking-[0.22em] text-primary">
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
              <article className="rounded-md border border-border/55 bg-card/55 p-5">
                <div className="flex items-center gap-3">
                  <Compass className="h-5 w-5 text-primary" aria-hidden />
                  <p className="text-xs uppercase tracking-[0.22em] text-primary">
                    Reading
                  </p>
                </div>
                <p className="mt-3 leading-7 text-muted-foreground">
                  {result.aiAlignment.summary}
                </p>
              </article>
            ) : null}
          </aside>

          <div className="grid gap-4">
            <div className="flex items-center gap-3">
              <Flame className="h-5 w-5 text-primary" aria-hidden />
              <h2 className="font-serif text-3xl font-semibold">
                Alignment Prescription
              </h2>
            </div>
            {prescription.map(([label, body]) => (
              <article
                key={label}
                className="rounded-md border border-border/55 bg-card/55 p-5"
              >
                <p className="text-xs uppercase tracking-[0.22em] text-primary">
                  {label}
                </p>
                <p className="mt-2 leading-7 text-muted-foreground">{body}</p>
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
    <div className="flex items-center justify-between rounded-md border border-border/55 bg-card/55 px-4 py-3">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-foreground">{value}</span>
    </div>
  );
}
