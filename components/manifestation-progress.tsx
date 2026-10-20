"use client";

import { FormEvent, useEffect, useState } from "react";
import { Check, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useManifestations } from "@/lib/use-manifestations";
import { addDevelopment, withManifestations } from "@/lib/manifestations";
import {
  getOnboardingProfile,
  saveOnboardingProfile,
} from "@/lib/onboarding-storage";
import { saveOnboardingProfileToAccount } from "@/lib/account-data";
import { getCheckIns } from "@/lib/alignment";
import { getJournalEntries } from "@/lib/journal-storage";
import type { GoalDevelopment, ManifestationGoal } from "@/lib/types";

export function ManifestationProgress({ goalId }: { goalId?: string }) {
  const { primary: dailyFocus, state } = useManifestations();
  const primary = goalId
    ? (state?.goals.find((goal) => goal.id === goalId) ?? null)
    : dailyFocus;
  const [kind, setKind] = useState<GoalDevelopment["kind"]>("note");
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [summary, setSummary] = useState({
    average: "—",
    actions: [] as GoalDevelopment[],
  });
  useEffect(() => {
    const refresh = () => {
      const checkIns = getCheckIns(primary?.id);
      const actions = getJournalEntries(primary?.id)
        .filter(
          (entry) => entry.alignedActionCompletedAt && entry.alignedAction,
        )
        .map((entry) => ({
          id: entry.id,
          kind: "action" as const,
          text: entry.alignedAction!,
          createdAt: entry.alignedActionCompletedAt!,
          completedAt: entry.alignedActionCompletedAt,
        }));
      setSummary({
        average: checkIns.length
          ? (
              checkIns.reduce((sum, item) => sum + item.beingScore, 0) /
              checkIns.length
            ).toFixed(1)
          : "—",
        actions,
      });
    };
    queueMicrotask(refresh);
    window.addEventListener("clearpth:journal-changed", refresh);
    window.addEventListener("clearpth:check-ins-changed", refresh);
    return () => {
      window.removeEventListener("clearpth:journal-changed", refresh);
      window.removeEventListener("clearpth:check-ins-changed", refresh);
    };
  }, [primary?.id]);
  const saveGoal = async (
    update: (goal: ManifestationGoal) => ManifestationGoal,
  ) => {
    const profile = getOnboardingProfile();
    if (!profile?.manifestations || !primary) return;
    setBusy(true);
    setError("");
    try {
      const next = withManifestations(profile, {
        ...profile.manifestations,
        goals: profile.manifestations.goals.map((goal) =>
          goal.id === primary.id ? update(goal) : goal,
        ),
      });
      await saveOnboardingProfileToAccount(next);
      saveOnboardingProfile(next);
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save progress.");
      return false;
    } finally {
      setBusy(false);
    }
  };
  if (!primary) return null;
  const developments = primary.developments;
  const milestones = developments.filter((item) => item.kind === "milestone");
  const actions = [
    ...developments.filter((item) => item.kind === "action"),
    ...summary.actions,
  ];
  const timeline = [
    ...developments.map((item) => ({
      ...item,
      createdAt: item.completedAt ?? item.createdAt,
    })),
    ...summary.actions,
    {
      id: "created",
      kind: "note" as const,
      text: "Desired reality created",
      createdAt: primary.createdAt,
    },
  ].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (await saveGoal((goal) => addDevelopment(goal, kind, text))) setText("");
  };
  return (
    <section className="mx-auto mt-10 max-w-5xl border-t border-border/50 pt-8">
      <p className="clearpth-page-kicker">Manifestation Progress</p>
      <h2 className="mt-3 font-serif text-3xl">What is becoming real?</h2>
      <p className="mt-3 max-w-2xl break-words text-sm leading-7 text-muted-foreground">
        {primary.outcome}
      </p>
      <div className="mt-6 grid gap-5 sm:grid-cols-2">
        <div>
          <h3 className="text-sm font-medium text-primary">Inner Alignment</h3>
          <p className="mt-2 font-serif text-3xl">
            {summary.average}{" "}
            <span className="text-sm text-muted-foreground">/ 10 average</span>
          </p>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Your self-reported thoughts, feelings, and willing.
          </p>
        </div>
        <div>
          <h3 className="text-sm font-medium text-primary">Outer Progress</h3>
          <p className="mt-2 text-lg">
            {milestones.length
              ? `${milestones.filter((item) => item.completedAt).length} / ${milestones.length} milestones`
              : "No milestones set"}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {actions.length} actions completed ·{" "}
            {primary.status === "completed"
              ? "Goal completed"
              : primary.status === "archived"
                ? "Archived"
                : "In progress"}
          </p>
        </div>
      </div>
      <p className="mt-5 text-xs leading-6 text-muted-foreground">
        Alignment is a reflection, not a scientific measurement or a promise of
        results. Your real-world developments tell their own story.
      </p>
      <details
        className="mt-6 border-t border-border/40 pt-4"
        open={developments.length === 0}
      >
        <summary className="cursor-pointer py-2 text-sm text-foreground">
          Record a development
        </summary>
        <form className="mt-4 space-y-3" onSubmit={submit}>
          <label className="block text-sm">
            Type
            <select
              className="goal-input mt-2"
              value={kind}
              onChange={(e) =>
                setKind(e.target.value as GoalDevelopment["kind"])
              }
            >
              <option value="note">Progress note</option>
              <option value="milestone">Milestone to reach</option>
              <option value="action">Action completed</option>
            </select>
          </label>
          <Textarea
            required
            maxLength={2000}
            aria-label="Development"
            placeholder="What changed, or what are you working toward?"
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
          <Button disabled={busy} type="submit" size="sm">
            <Plus className="h-4 w-4" aria-hidden />
            {busy ? "Saving..." : "Add"}
          </Button>
        </form>
      </details>
      {error ? (
        <p role="alert" className="mt-3 text-sm text-primary">
          {error}
        </p>
      ) : null}
      {milestones.length ? (
        <div className="mt-6 space-y-2">
          <h3 className="mb-3 text-sm text-muted-foreground">Milestones</h3>
          {milestones.map((milestone) => (
            <label
              key={milestone.id}
              className="flex min-h-12 items-start gap-3 py-2 text-sm leading-6"
            >
              <input
                className="mt-1 h-4 w-4 shrink-0 accent-primary"
                type="checkbox"
                checked={Boolean(milestone.completedAt)}
                disabled={busy}
                onChange={() =>
                  void saveGoal((goal) => ({
                    ...goal,
                    developments: goal.developments.map((item) =>
                      item.id === milestone.id
                        ? {
                            ...item,
                            completedAt: item.completedAt
                              ? undefined
                              : new Date().toISOString(),
                          }
                        : item,
                    ),
                    updatedAt: new Date().toISOString(),
                  }))
                }
              />
              <span className="break-words">{milestone.text}</span>
            </label>
          ))}
        </div>
      ) : null}
      <details className="mt-6 border-t border-border/40 pt-4">
        <summary className="cursor-pointer py-2 text-sm">
          Your timeline · {timeline.length} developments
        </summary>
        <ol className="mt-5 space-y-5 border-l border-primary/25 pl-5">
          {timeline.map((item) => (
            <li key={item.id} className="min-w-0">
              <p className="text-xs text-muted-foreground">
                {new Date(item.createdAt).toLocaleDateString()} ·{" "}
                {item.kind === "action"
                  ? "Action completed"
                  : item.kind === "milestone"
                    ? item.completedAt
                      ? "Milestone reached"
                      : "Milestone set"
                    : "Progress note"}
              </p>
              <p className="mt-1 break-words text-sm leading-7">
                {item.text}
                {item.completedAt && item.kind === "milestone" ? (
                  <Check
                    className="ml-2 inline h-4 w-4 text-primary"
                    aria-label="Completed"
                  />
                ) : null}
              </p>
            </li>
          ))}
        </ol>
      </details>
      {state?.innerFoundation ? (
        <p className="sr-only">Foundation: {state.innerFoundation}</p>
      ) : null}
    </section>
  );
}
