"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  getCurrentAccount,
  saveOnboardingProfileToAccount,
} from "@/lib/account-data";
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

const steps = [
  {
    id: "primaryGoal",
    kicker: "Question 01",
    title: "What do you want?",
    description:
      "Write it plainly. It can be material, emotional, relational, spiritual, practical, or hard to explain.",
  },
  {
    id: "currentChallenge",
    kicker: "Question 02",
    title: "What seems to be in the way?",
    description:
      "Name the pattern, pressure, fear, habit, delay, or situation that keeps appearing.",
  },
  {
    id: "desiredState",
    kicker: "Question 03",
    title: "Who would you need to become to meet it?",
    description:
      "Think less about perfection and more about the state that could hold what you want.",
  },
  {
    id: "birthDate",
    kicker: "Question 04",
    title: "When were you born?",
    description:
      "This helps ClearPth tune the rhythm of your reflections. You can leave it blank if you prefer.",
  },
  {
    id: "practiceStyle",
    kicker: "Question 05",
    title: "How should the practice feel?",
    description: "Choose the rhythm that would make this app easier to return to.",
  },
  {
    id: "spiritualOpenness",
    kicker: "Question 06",
    title: "How mystical should the language feel?",
    description:
      "ClearPth can stay grounded, go deeper, or sit somewhere in between.",
  },
  {
    id: "commitmentLevel",
    kicker: "Question 07",
    title: "What commitment level feels honest?",
    description: "Choose what you can actually live with right now.",
  },
  {
    id: "guidanceTone",
    kicker: "Final Question",
    title: "What tone helps you most?",
    description:
      "This shapes how direct, gentle, concise, or challenging the guidance feels.",
  },
] as const;

type StepId = (typeof steps)[number]["id"];

const placeholders: Record<
  Extract<StepId, "primaryGoal" | "currentChallenge" | "desiredState">,
  string
> = {
  primaryGoal:
    "Example: more money, a better relationship, confidence, direction, peace, discipline, a new life...",
  currentChallenge:
    "Example: I keep delaying, I do not trust myself yet, I feel distracted, I am scared to ask...",
  desiredState:
    "Example: calm, confident, disciplined, secure, open, honest, courageous, self-respecting...",
};

export default function OnboardingPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<OnboardingProfile>(
    createEmptyOnboardingProfile(),
  );
  const [stepIndex, setStepIndex] = useState(0);
  const [direction, setDirection] = useState<"forward" | "back">("forward");
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [finalChoiceConfirmed, setFinalChoiceConfirmed] = useState(false);

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
    setError("");
    if (field === "guidanceTone") {
      setFinalChoiceConfirmed(true);
    }
    setProfile((current) => ({ ...current, [field]: value }));
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!finalChoiceConfirmed) {
      setError("Choose the tone that helps you most before continuing.");
      return;
    }

    const account = await getCurrentAccount();
    if (!account) {
      setError("Sign in or create an account to save what you want.");
      return;
    }

    const nextProfile = {
      ...profile,
      updatedAt: new Date().toISOString(),
    };

    await saveOnboardingProfileToAccount(nextProfile);
    saveOnboardingProfile(nextProfile);
    setSaved(true);
    router.push("/check-in");
  };

  const step = steps[stepIndex];
  const isFinalStep = stepIndex === steps.length - 1;
  const progress = ((stepIndex + 1) / steps.length) * 100;

  const goNext = () => {
    if (isFinalStep) return;
    setError("");
    setDirection("forward");
    setStepIndex((current) => Math.min(current + 1, steps.length - 1));
  };

  const goBack = () => {
    setError("");
    setDirection("back");
    setFinalChoiceConfirmed(false);
    setStepIndex((current) => Math.max(current - 1, 0));
  };

  return (
    <main className="container flex min-h-[calc(100dvh-10rem)] items-center py-6 md:min-h-[calc(100vh-5rem)] md:py-12">
      <section className="mx-auto w-full max-w-3xl">
        <p className="clearpth-page-kicker">Your Desired Reality</p>
        <h1 className="clearpth-page-title">Start With What You Want</h1>
        <p className="mt-4 max-w-2xl leading-7 text-muted-foreground">
          Say it plainly. ClearPth will help unpack the state, pattern, and next
          step underneath it.
        </p>
        <form className="mt-8" onSubmit={submit}>
          <section className="aura-glass overflow-hidden rounded-lg p-5 md:p-7">
            <div className="flex items-center justify-between gap-4">
              <p className="text-xs uppercase tracking-[0.24em] text-primary">
                {step.kicker}
              </p>
              <p className="text-xs text-muted-foreground">
                {stepIndex + 1} / {steps.length}
              </p>
            </div>

            <div className="mt-4 h-1 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary transition-all duration-500 ease-out"
                style={{ width: `${progress}%` }}
              />
            </div>

            <div
              key={step.id}
              className={`mt-8 animate-onboarding-${direction}`}
            >
              <h2 className="font-serif text-4xl font-semibold leading-tight md:text-5xl">
                {step.title}
              </h2>
              <p className="mt-4 max-w-2xl leading-7 text-muted-foreground">
                {step.description}
              </p>

              <div className="mt-7">
                <StepInput
                  stepId={step.id}
                  profile={profile}
                  updateField={updateField}
                />
              </div>
            </div>
          </section>

          <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <Button
              type="button"
              variant="secondary"
              disabled={stepIndex === 0}
              onClick={goBack}
            >
              <ArrowLeft className="h-4 w-4" aria-hidden />
              Back
            </Button>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              {error ? <span className="text-sm text-primary">{error}</span> : null}
              {saved ? (
                <span className="inline-flex items-center gap-2 text-sm text-muted-foreground">
                  <CheckCircle2 className="h-4 w-4" aria-hidden />
                  Saved
                </span>
              ) : null}
              {isFinalStep ? (
                <Button
                  type="submit"
                  size="lg"
                  disabled={!finalChoiceConfirmed}
                >
                  Continue To Check In
                  <ArrowRight className="h-4 w-4" aria-hidden />
                </Button>
              ) : (
                <Button type="button" size="lg" onClick={goNext}>
                  Next
                  <ArrowRight className="h-4 w-4" aria-hidden />
                </Button>
              )}
            </div>
          </div>

          <p className="mt-4 text-sm text-muted-foreground">
            Sign in to save this to your profile.
          </p>
        </form>
      </section>
    </main>
  );
}

function StepInput({
  stepId,
  profile,
  updateField,
}: {
  stepId: StepId;
  profile: OnboardingProfile;
  updateField: <K extends keyof OnboardingProfile>(
    field: K,
    value: OnboardingProfile[K],
  ) => void;
}) {
  if (
    stepId === "primaryGoal" ||
    stepId === "currentChallenge" ||
    stepId === "desiredState"
  ) {
    return (
      <Textarea
        className="min-h-[180px] text-lg leading-8 md:min-h-[220px]"
        value={profile[stepId]}
        onChange={(event) => updateField(stepId, event.target.value)}
        placeholder={placeholders[stepId]}
        rows={5}
        autoFocus
      />
    );
  }

  if (stepId === "birthDate") {
    return (
      <label className="block text-sm font-medium text-muted-foreground">
        Birthday
        <input
          className="mt-3 h-14 w-full rounded-md border border-input bg-card px-4 text-base text-foreground outline-none transition focus:ring-2 focus:ring-ring"
          type="date"
          value={profile.birthDate ?? ""}
          onChange={(event) => updateField("birthDate", event.target.value)}
        />
      </label>
    );
  }

  const optionsByStep = {
    practiceStyle: practiceStyles,
    spiritualOpenness,
    commitmentLevel: commitmentLevels,
    guidanceTone: guidanceTones,
  };

  return (
    <div className="grid gap-3">
      {optionsByStep[stepId].map((option) => {
        const selected = profile[stepId] === option;

        return (
          <button
            key={option}
            type="button"
            onClick={() => updateField(stepId, option)}
            className={`rounded-md border px-4 py-4 text-left text-base transition ${
              selected
                ? "border-primary/55 bg-primary/15 text-foreground"
                : "border-border/70 bg-card/45 text-muted-foreground hover:border-foreground/35 hover:text-foreground"
            }`}
          >
            <span className="flex items-center justify-between gap-3">
              {option}
              {selected ? (
                <CheckCircle2 className="h-5 w-5 text-primary" aria-hidden />
              ) : null}
            </span>
          </button>
        );
      })}
    </div>
  );
}
