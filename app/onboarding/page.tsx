"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  createEmptyOnboardingProfile,
  getOnboardingProfile,
  saveOnboardingProfile,
} from "@/lib/onboarding-storage";
import type { OnboardingProfile } from "@/lib/types";

const practiceStyles = [
  "Balanced reflection and action",
  "More practical action",
  "More inner reflection",
  "Short and direct",
];

const spiritualOpenness = [
  "Open, but keep it grounded",
  "Very open to mystical language",
  "Mostly practical and psychological",
];

const commitmentLevels = [
  "A few minutes most days",
  "Daily check-ins",
  "Deep weekly reflection",
  "Still exploring",
];

const guidanceTones = [
  "Direct and grounded",
  "Gentle and reflective",
  "Strong and challenging",
  "Practical and concise",
];

export default function OnboardingPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<OnboardingProfile>(
    createEmptyOnboardingProfile(),
  );
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    queueMicrotask(() => {
      setProfile(getOnboardingProfile() ?? createEmptyOnboardingProfile());
    });
  }, []);

  const updateField = <K extends keyof OnboardingProfile>(
    field: K,
    value: OnboardingProfile[K],
  ) => {
    setSaved(false);
    setProfile((current) => ({ ...current, [field]: value }));
  };

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    saveOnboardingProfile(profile);
    setSaved(true);
    router.push("/check-in");
  };

  return (
    <main className="container py-8 md:py-12">
      <section className="mx-auto max-w-5xl">
        <p className="clearpth-page-kicker">Personal Setup</p>
        <h1 className="clearpth-page-title">Tune ClearPth To Your Path</h1>
        <p className="mt-4 max-w-2xl leading-7 text-muted-foreground">
          Answer these once so your check-ins, Guide responses, and analysis can
          better understand what you are actually trying to change.
        </p>
      </section>

      <form className="mx-auto mt-8 grid max-w-5xl gap-5" onSubmit={submit}>
        <OnboardingField
          label="What are you here to improve or understand?"
          value={profile.primaryGoal}
          onChange={(value) => updateField("primaryGoal", value)}
          placeholder="Example: discipline, confidence, emotional stability, direction, relationships, purpose..."
        />
        <OnboardingField
          label="What pattern or challenge keeps repeating?"
          value={profile.currentChallenge}
          onChange={(value) => updateField("currentChallenge", value)}
          placeholder="Name the recurring issue in plain language."
        />
        <OnboardingField
          label="What state are you trying to live from more often?"
          value={profile.desiredState}
          onChange={(value) => updateField("desiredState", value)}
          placeholder="Example: calm authority, faith, self-respect, clarity, courage, grounded joy..."
        />

        <section className="aura-glass rounded-lg p-5 md:p-6">
          <div className="grid gap-5 md:grid-cols-2">
            <SelectField
              label="How should the practice feel?"
              value={profile.practiceStyle}
              options={practiceStyles}
              onChange={(value) => updateField("practiceStyle", value)}
            />
            <SelectField
              label="How much mystical language should it use?"
              value={profile.spiritualOpenness}
              options={spiritualOpenness}
              onChange={(value) => updateField("spiritualOpenness", value)}
            />
            <SelectField
              label="What commitment level feels honest?"
              value={profile.commitmentLevel}
              options={commitmentLevels}
              onChange={(value) => updateField("commitmentLevel", value)}
            />
            <SelectField
              label="What tone helps you most?"
              value={profile.guidanceTone}
              options={guidanceTones}
              onChange={(value) => updateField("guidanceTone", value)}
            />
          </div>
        </section>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground">
            This profile stays in this browser and can be updated anytime.
          </p>
          <div className="flex items-center gap-3">
            {saved ? (
              <span className="inline-flex items-center gap-2 text-sm text-muted-foreground">
                <CheckCircle2 className="h-4 w-4" aria-hidden />
                Saved
              </span>
            ) : null}
            <Button type="submit" size="lg">
              Continue To Check-In
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Button>
          </div>
        </div>
      </form>
    </main>
  );
}

function OnboardingField({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}) {
  return (
    <section className="aura-glass rounded-lg p-5 md:p-6">
      <Label>{label}</Label>
      <Textarea
        className="mt-3"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        rows={3}
      />
    </section>
  );
}

function SelectField({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <select
        className="h-12 w-full rounded-md border border-input bg-card px-4 text-base text-foreground outline-none transition focus:ring-2 focus:ring-ring md:text-sm"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </div>
  );
}
