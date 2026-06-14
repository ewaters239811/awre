"use client";

import { FormEvent, ReactNode, useEffect, useState } from "react";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  createEmptyRitual,
  getRitualForDate,
  saveRitual,
  toDateKey,
} from "@/lib/ritual-storage";
import type { DailyRitual } from "@/lib/types";

const today = toDateKey(new Date());

type SaveState = "idle" | "morning" | "evening";

export default function RitualPage() {
  const [ritual, setRitual] = useState<DailyRitual | null>(null);
  const [savedSection, setSavedSection] = useState<SaveState>("idle");

  useEffect(() => {
    queueMicrotask(() =>
      setRitual(getRitualForDate(today) ?? createEmptyRitual()),
    );
  }, []);

  const updateField = <K extends keyof DailyRitual>(
    field: K,
    value: DailyRitual[K],
  ) => {
    setSavedSection("idle");
    setRitual((current) => (current ? { ...current, [field]: value } : current));
  };

  const saveSection = (
    event: FormEvent<HTMLFormElement>,
    section: Exclude<SaveState, "idle">,
  ) => {
    event.preventDefault();
    if (!ritual) return;
    saveRitual(ritual);
    setSavedSection(section);
  };

  if (!ritual) {
    return <main className="container py-12">Loading ritual...</main>;
  }

  const morningComplete = Boolean(
    ritual.chosenBeing.trim() ||
      ritual.morningIntention.trim() ||
      ritual.protectedBoundary.trim(),
  );
  const eveningComplete = Boolean(
    ritual.eveningAlignment.trim() ||
      ritual.eveningFragmentation.trim() ||
      ritual.lesson.trim(),
  );

  return (
    <main className="container py-8 md:py-12">
      <section className="mx-auto max-w-5xl">
        <p className="clearpth-page-kicker">Daily Ritual</p>
        <h1 className="clearpth-page-title">
          Morning Intention. Evening Review.
        </h1>
        <p className="mt-4 max-w-2xl text-muted-foreground">
          Save the morning ritual when the day begins. Return later, even after
          closing the app, to complete the evening review for the same date.
        </p>
      </section>

      <section className="mx-auto mt-8 grid max-w-5xl gap-6 lg:grid-cols-2">
        <RitualCard
          title="Morning"
          kicker="Begin"
          complete={morningComplete}
          saved={savedSection === "morning"}
          saveLabel="Save Morning Ritual"
          onSubmit={(event) => saveSection(event, "morning")}
        >
          <TextAreaField
            label="What Being are you choosing today?"
            value={ritual.chosenBeing}
            onChange={(value) => updateField("chosenBeing", value)}
          />
          <TextAreaField
            label="What intention will organize your thoughts, actions, and feelings?"
            value={ritual.morningIntention}
            onChange={(value) => updateField("morningIntention", value)}
          />
          <TextAreaField
            label="What boundary will protect your alignment?"
            value={ritual.protectedBoundary}
            onChange={(value) => updateField("protectedBoundary", value)}
          />
        </RitualCard>

        <RitualCard
          title="Evening"
          kicker="Return"
          complete={eveningComplete}
          saved={savedSection === "evening"}
          saveLabel="Save Evening Review"
          onSubmit={(event) => saveSection(event, "evening")}
        >
          <TextAreaField
            label="Where did you align today?"
            value={ritual.eveningAlignment}
            onChange={(value) => updateField("eveningAlignment", value)}
          />
          <TextAreaField
            label="Where did you fragment or leak energy?"
            value={ritual.eveningFragmentation}
            onChange={(value) => updateField("eveningFragmentation", value)}
          />
          <TextAreaField
            label="What lesson does your Being carry into tomorrow?"
            value={ritual.lesson}
            onChange={(value) => updateField("lesson", value)}
          />
        </RitualCard>
      </section>

      <section className="aura-glass mx-auto mt-6 max-w-5xl rounded-lg p-5">
        <p className="text-xs uppercase tracking-[0.24em] text-primary">
          Today
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <StatusRow label="Morning ritual" complete={morningComplete} />
          <StatusRow label="Evening review" complete={eveningComplete} />
        </div>
      </section>
    </main>
  );
}

function RitualCard({
  title,
  kicker,
  complete,
  saved,
  saveLabel,
  onSubmit,
  children,
}: {
  title: string;
  kicker: string;
  complete: boolean;
  saved: boolean;
  saveLabel: string;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  children: ReactNode;
}) {
  return (
    <form className="aura-glass rounded-lg p-5 md:p-6" onSubmit={onSubmit}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.24em] text-primary">
            {kicker}
          </p>
          <h2 className="mt-2 font-serif text-3xl font-semibold">{title}</h2>
        </div>
        <StatusPill complete={complete} />
      </div>
      <div className="mt-6 grid gap-5">{children}</div>
      <div className="mt-6 flex items-center gap-4">
        <Button type="submit">{saveLabel}</Button>
        {saved ? <p className="text-sm text-primary">Saved.</p> : null}
      </div>
    </form>
  );
}

function TextAreaField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        rows={3}
      />
    </div>
  );
}

function StatusPill({ complete }: { complete: boolean }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-md border border-border/55 bg-black/18 px-3 py-2 text-xs text-muted-foreground">
      {complete ? <Check className="h-3.5 w-3.5 text-primary" /> : null}
      {complete ? "Started" : "Open"}
    </span>
  );
}

function StatusRow({ label, complete }: { label: string; complete: boolean }) {
  return (
    <div className="flex items-center justify-between rounded-md border border-border/55 bg-black/18 px-4 py-3">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm text-primary">
        {complete ? "Saved for today" : "Still open"}
      </span>
    </div>
  );
}
