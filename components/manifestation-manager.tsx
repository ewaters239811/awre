"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import {
  Archive,
  Check,
  Pencil,
  Plus,
  RotateCcw,
  Save,
  Target,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useManifestations } from "@/lib/use-manifestations";
import {
  createManifestation,
  setManifestationStatus,
  selectManifestation,
  withManifestations,
  reclassifyLegacyFoundation,
} from "@/lib/manifestations";
import {
  getOnboardingProfile,
  saveOnboardingProfile,
} from "@/lib/onboarding-storage";
import { saveOnboardingProfileToAccount } from "@/lib/account-data";
import { MANIFESTATION_CATEGORIES } from "@/lib/types";
import type {
  ManifestationCategory,
  ManifestationGoal,
  OnboardingProfile,
} from "@/lib/types";
import { ManifestationProgress } from "@/components/manifestation-progress";
import { getCheckIns } from "@/lib/alignment";
import { getJournalEntries } from "@/lib/journal-storage";

const empty = {
  outcome: "",
  category: "Other" as ManifestationCategory,
  targetDate: "",
  identity: "",
};

export function ManifestationManager() {
  const { profile, state, loaded } = useManifestations();
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState(empty);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [foundation, setFoundation] = useState<string | null>(null);
  const [showPast, setShowPast] = useState(false);
  const persist = async (next: OnboardingProfile) => {
    setBusy(true);
    setError("");
    try {
      await saveOnboardingProfileToAccount(next);
      saveOnboardingProfile(next);
      return true;
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Could not save. Please try again.",
      );
      return false;
    } finally {
      setBusy(false);
    }
  };
  const saveGoal = async (event: FormEvent) => {
    event.preventDefault();
    const current = getOnboardingProfile();
    if (!current?.manifestations) return;
    try {
      const original = current.manifestations.goals.find(
        (goal) => goal.id === editing,
      );
      const nextGoal = {
        ...createManifestation(draft),
        ...(original
          ? {
              id: original.id,
              createdAt: original.createdAt,
              status: original.status,
              completedAt: original.completedAt,
              developments: original.developments,
            }
          : {}),
      };
      const goals = original
        ? current.manifestations.goals.map((goal) =>
            goal.id === original.id ? nextGoal : goal,
          )
        : [...current.manifestations.goals, nextGoal];
      const next = withManifestations(current, {
        ...current.manifestations,
        goals,
        primaryGoalId:
          current.manifestations.primaryGoalId ??
          (nextGoal.status === "active" ? nextGoal.id : null),
      });
      if (await persist(next)) {
        setEditing(null);
        setDraft(empty);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Please review your goal.");
    }
  };
  const changeStatus = (
    goal: ManifestationGoal,
    status: ManifestationGoal["status"],
  ) => {
    const current = getOnboardingProfile();
    if (current) void persist(setManifestationStatus(current, goal.id, status));
  };
  if (!loaded)
    return (
      <p className="py-8 text-muted-foreground">
        Loading your desired realities...
      </p>
    );
  if (!profile || !state)
    return (
      <div className="py-8">
        <p className="text-sm text-muted-foreground">
          Sign in and complete setup to create your desired realities.
        </p>
        <Button asChild className="mt-5">
          <Link href="/login">Sign in</Link>
        </Button>
        <Button asChild variant="secondary" className="ml-3 mt-5">
          <Link href="/onboarding">Open setup</Link>
        </Button>
      </div>
    );
  const visible = state.goals.filter(
    (goal) => showPast || goal.status === "active",
  );
  return (
    <>
      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <Button
          onClick={() => {
            setEditing("new");
            setDraft(empty);
          }}
          disabled={busy}
        >
          <Plus className="h-4 w-4" aria-hidden />
          New desired reality
        </Button>
        <label className="flex min-h-11 items-center gap-2 text-sm text-muted-foreground">
          <input
            type="checkbox"
            checked={showPast}
            onChange={(e) => setShowPast(e.target.checked)}
          />
          Include completed &amp; archived
        </label>
      </div>
      {error ? (
        <p role="alert" className="mt-4 text-sm text-primary">
          {error}
        </p>
      ) : null}
      {editing ? (
        <form
          onSubmit={saveGoal}
          className="mt-6 space-y-5 border-y border-border py-6"
        >
          <h2 className="font-serif text-2xl">
            {editing === "new"
              ? "A reality worth creating"
              : "Refine your desired reality"}
          </h2>
          <label className="block text-sm">
            What would you recognize as success?
            <Textarea
              required
              maxLength={2000}
              className="mt-2"
              value={draft.outcome}
              onChange={(e) => setDraft({ ...draft, outcome: e.target.value })}
              placeholder="I do fulfilling work that supports the life I want."
            />
          </label>
          <div className="grid gap-5 sm:grid-cols-2">
            <label className="block text-sm">
              Category
              <select
                className="goal-input mt-2"
                value={draft.category}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    category: e.target.value as ManifestationCategory,
                  })
                }
              >
                {MANIFESTATION_CATEGORIES.map((category) => (
                  <option key={category}>{category}</option>
                ))}
              </select>
            </label>
            <label className="block text-sm">
              Target date{" "}
              <span className="text-muted-foreground">(optional)</span>
              <input
                type="date"
                className="goal-input mt-2"
                value={draft.targetDate}
                onChange={(e) =>
                  setDraft({ ...draft, targetDate: e.target.value })
                }
              />
            </label>
          </div>
          <label className="block text-sm">
            Who are you becoming?{" "}
            <span className="text-muted-foreground">(optional)</span>
            <Textarea
              className="mt-2"
              maxLength={2000}
              value={draft.identity}
              onChange={(e) => setDraft({ ...draft, identity: e.target.value })}
              placeholder="I am someone who follows through with calm confidence."
            />
          </label>
          <div className="flex flex-wrap gap-3">
            <Button disabled={busy} type="submit">
              <Save className="h-4 w-4" aria-hidden />
              {busy ? "Saving..." : "Save"}
            </Button>
            <Button
              type="button"
              variant="secondary"
              disabled={busy}
              onClick={() => setEditing(null)}
            >
              Cancel
            </Button>
          </div>
        </form>
      ) : null}
      <div className="mt-7 space-y-5">
        {visible.length === 0 ? (
          <p className="py-6 text-muted-foreground">
            Create a desired reality, or reactivate one from your archive.
          </p>
        ) : (
          visible.map((goal) => (
            <article
              key={goal.id}
              className="rounded-lg border border-border/60 bg-card/30 p-5 sm:p-6"
            >
              <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <span>{goal.category}</span>
                <span aria-hidden>·</span>
                <span>
                  {goal.status === "active"
                    ? state.primaryGoalId === goal.id
                      ? "Daily focus"
                      : "Active"
                    : goal.status === "completed"
                      ? "Completed"
                      : "Archived"}
                </span>
                {goal.targetDate ? <span>· {goal.targetDate}</span> : null}
              </div>
              <h2 className="mt-3 break-words font-serif text-2xl leading-snug">
                {goal.outcome}
              </h2>
              {goal.identity ? (
                <p className="mt-3 break-words text-sm leading-7 text-muted-foreground">
                  {goal.identity}
                </p>
              ) : null}
              <div className="mt-5 flex flex-wrap gap-2">
                {goal.status === "active" && state.primaryGoalId !== goal.id ? (
                  <Button
                    size="sm"
                    variant="secondary"
                    disabled={busy}
                    onClick={() =>
                      void persist(selectManifestation(profile, goal.id))
                    }
                  >
                    <Target className="h-4 w-4" aria-hidden />
                    Make daily focus
                  </Button>
                ) : null}
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={busy}
                  onClick={() => {
                    setEditing(goal.id);
                    setDraft({
                      outcome: goal.outcome,
                      category: goal.category,
                      targetDate: goal.targetDate ?? "",
                      identity: goal.identity,
                    });
                  }}
                >
                  <Pencil className="h-4 w-4" aria-hidden />
                  Edit
                </Button>
                {goal.status === "active" ? (
                  <>
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={busy}
                      onClick={() => changeStatus(goal, "completed")}
                    >
                      <Check className="h-4 w-4" aria-hidden />
                      Complete
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={busy}
                      onClick={() => changeStatus(goal, "archived")}
                    >
                      <Archive className="h-4 w-4" aria-hidden />
                      Archive
                    </Button>
                  </>
                ) : (
                  <Button
                    size="sm"
                    variant="secondary"
                    disabled={busy}
                    onClick={() => changeStatus(goal, "active")}
                  >
                    <RotateCcw className="h-4 w-4" aria-hidden />
                    Reactivate
                  </Button>
                )}
              </div>
              {state.legacyGoalId === goal.id ? (
                <details className="mt-4 text-sm text-muted-foreground">
                  <summary className="cursor-pointer py-2">
                    Was this an identity statement?
                  </summary>
                  <p className="mt-2 leading-6">
                    You can add this statement to your Inner Foundation. This
                    goal will be archived and its history preserved.
                  </p>
                  <Button
                    variant="secondary"
                    size="sm"
                    className="mt-3"
                    disabled={busy}
                    onClick={() => {
                      try {
                        void persist(
                          reclassifyLegacyFoundation(profile, goal.id),
                        );
                      } catch (e) {
                        setError(
                          e instanceof Error
                            ? e.message
                            : "Could not reclassify this statement.",
                        );
                      }
                    }}
                  >
                    Use as Inner Foundation
                  </Button>
                </details>
              ) : null}
              <details className="mt-4 border-t border-border/40 pt-3">
                <summary className="cursor-pointer py-2 text-sm text-muted-foreground">
                  Progress &amp; history
                </summary>
                <GoalHistory goalId={goal.id} />
                <ManifestationProgress goalId={goal.id} />
              </details>
            </article>
          ))
        )}
      </div>
      <section className="mt-10 border-t border-border/50 pt-7">
        <h2 className="font-serif text-2xl">Your Inner Foundation</h2>
        <p className="mt-2 text-sm leading-7 text-muted-foreground">
          Who you choose to be, whatever happens. Optional, and shared across
          your desired realities.
        </p>
        <form
          className="mt-4 space-y-4"
          onSubmit={async (event) => {
            event.preventDefault();
            if (
              await persist(
                withManifestations(profile, {
                  ...state,
                  innerFoundation: (foundation ?? state.innerFoundation).trim(),
                }),
              )
            )
              setFoundation(null);
          }}
        >
          <Textarea
            aria-label="Your Inner Foundation"
            value={foundation ?? state.innerFoundation}
            maxLength={2000}
            onChange={(e) => setFoundation(e.target.value)}
            placeholder="I am whole, confident, joyful, and secure in my worth."
          />
          <Button type="submit" variant="secondary" disabled={busy}>
            <Save className="h-4 w-4" aria-hidden />
            Save foundation
          </Button>
        </form>
      </section>
    </>
  );
}

function GoalHistory({ goalId }: { goalId: string }) {
  const checkIns = getCheckIns(goalId);
  const journals = getJournalEntries(goalId);
  return (
    <div className="mt-4 grid min-w-0 gap-6 sm:grid-cols-2">
      <div>
        <h3 className="text-sm font-medium">Alignment history</h3>
        {checkIns.length ? (
          <ul className="mt-3 space-y-3">
            {checkIns.map((item) => (
              <li
                key={item.id}
                className="flex flex-wrap items-baseline justify-between gap-2 text-sm"
              >
                <Link
                  className="underline underline-offset-4"
                  href={`/results?id=${item.id}`}
                >
                  {new Date(item.createdAt).toLocaleDateString()}
                </Link>
                <span className="text-muted-foreground">
                  {item.beingScore.toFixed(1)} / 10
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 text-sm text-muted-foreground">
            No check-ins yet.
          </p>
        )}
      </div>
      <div>
        <h3 className="text-sm font-medium">Journal entries</h3>
        {journals
          .filter((entry) => entry.content.trim())
          .map((entry) => (
            <details key={entry.id} className="mt-3 text-sm">
              <summary className="cursor-pointer py-2 text-muted-foreground">
                {entry.date}
              </summary>
              <p className="mt-2 whitespace-pre-wrap break-words leading-7">
                {entry.content}
              </p>
            </details>
          ))}
        {!journals.some((entry) => entry.content.trim()) ? (
          <p className="mt-3 text-sm text-muted-foreground">
            No journal entries yet.
          </p>
        ) : null}
      </div>
    </div>
  );
}
