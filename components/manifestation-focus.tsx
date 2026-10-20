"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowUpRight } from "lucide-react";
import { useManifestations } from "@/lib/use-manifestations";
import { selectManifestation } from "@/lib/manifestations";
import { saveOnboardingProfile } from "@/lib/onboarding-storage";
import { saveOnboardingProfileToAccount } from "@/lib/account-data";

export function ManifestationFocus({ compact = false }: { compact?: boolean }) {
  const { profile, primary, state } = useManifestations();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const switchGoal = async (id: string) => {
    if (!profile) return;
    setSaving(true);
    setError("");
    try {
      const next = selectManifestation(profile, id);
      await saveOnboardingProfileToAccount(next);
      saveOnboardingProfile(next);
    } catch {
      setError("Could not switch your focus. Please try again.");
    } finally {
      setSaving(false);
    }
  };
  return (
    <section
      className={`min-w-0 border-b border-border/50 ${compact ? "py-5" : "py-8"}`}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs uppercase tracking-[0.18em] text-primary">
          Your Desired Reality
        </p>
        <Link
          href="/manifestations"
          className="inline-flex min-h-10 items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          Manage <ArrowUpRight className="h-4 w-4" aria-hidden />
        </Link>
      </div>
      {(state?.goals.filter((goal) => goal.status === "active").length ?? 0) >
      1 ? (
        <label className="mt-2 block text-xs text-muted-foreground">
          Daily focus
          <select
            className="mt-2 min-h-12 w-full rounded-md border border-border bg-card px-3 text-base text-foreground"
            value={primary?.id ?? ""}
            disabled={saving}
            onChange={(event) => void switchGoal(event.target.value)}
          >
            {!primary ? (
              <option value="" disabled>
                Choose a focus
              </option>
            ) : null}
            {state?.goals
              .filter((goal) => goal.status === "active")
              .map((goal) => (
                <option key={goal.id} value={goal.id}>
                  {goal.outcome}
                </option>
              ))}
          </select>
        </label>
      ) : null}
      <p
        className={`mt-3 break-words font-serif font-semibold leading-snug ${compact ? "text-xl" : "text-3xl"}`}
      >
        {primary?.outcome ?? "What would you like to create?"}
      </p>
      {!primary ? (
        <Link
          className="mt-3 inline-block text-sm text-primary underline underline-offset-4"
          href="/manifestations"
        >
          Create your desired reality
        </Link>
      ) : null}
      {!compact && state?.innerFoundation ? (
        <div className="mt-6 max-w-xl">
          <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
            Your Inner Foundation
          </p>
          <p className="mt-2 break-words text-sm leading-7 text-foreground/80">
            {state.innerFoundation}
          </p>
        </div>
      ) : null}
      {error ? (
        <p role="alert" className="mt-3 text-sm text-primary">
          {error}
        </p>
      ) : null}
    </section>
  );
}
