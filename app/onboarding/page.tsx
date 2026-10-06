"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Loader2,
  Mic,
  MicOff,
  SlidersHorizontal,
  Sparkles,
} from "lucide-react";
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

type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;

type SpeechRecognitionLike = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
};

type SpeechRecognitionEventLike = {
  results: ArrayLike<{
    0: {
      transcript: string;
    };
    isFinal: boolean;
  }>;
};

type SpeechWindow = Window & {
  SpeechRecognition?: SpeechRecognitionConstructor;
  webkitSpeechRecognition?: SpeechRecognitionConstructor;
};

type OnboardingProfileDraft = Pick<
  OnboardingProfile,
  | "primaryGoal"
  | "currentChallenge"
  | "desiredState"
  | "practiceStyle"
  | "spiritualOpenness"
  | "commitmentLevel"
  | "guidanceTone"
>;

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

const RETURN_TO_COVER_KEY = "clearpth.returnToCoverFromSetup";

const starterPrompt =
  "Tell me what you want, what feels in the way, and who you would need to become to hold it.";

export default function OnboardingPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<OnboardingProfile>(
    createEmptyOnboardingProfile(),
  );
  const [intake, setIntake] = useState("");
  const [phase, setPhase] = useState<"intake" | "review">("intake");
  const [showDetails, setShowDetails] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const speechBaseRef = useRef("");

  useEffect(() => {
    queueMicrotask(() => {
      const existingProfile = getOnboardingProfile();
      if (existingProfile) {
        setProfile(existingProfile);
        setIntake(buildIntakeFromProfile(existingProfile));
        setPhase("review");
      }

      const speechWindow = window as SpeechWindow;
      setSpeechSupported(
        Boolean(
          speechWindow.SpeechRecognition ||
            speechWindow.webkitSpeechRecognition,
        ),
      );
    });
  }, []);

  const updateField = <K extends keyof OnboardingProfile>(
    field: K,
    value: OnboardingProfile[K],
  ) => {
    setSaved(false);
    setError("");
    setProfile((current) => ({ ...current, [field]: value }));
  };

  const analyzeIntake = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const cleanIntake = intake.trim();
    setError("");
    setSaved(false);

    if (!cleanIntake) {
      setError("Tell ClearPth what you want first.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ intake: cleanIntake }),
      });
      const payload = (await response.json()) as {
        data?: OnboardingProfileDraft;
      };
      const draft = payload.data ?? buildFallbackProfile(cleanIntake);
      const now = new Date().toISOString();

      setProfile((current) => ({
        ...current,
        ...draft,
        createdAt: current.createdAt || now,
        updatedAt: now,
      }));
      setPhase("review");
    } catch {
      const now = new Date().toISOString();
      setProfile((current) => ({
        ...current,
        ...buildFallbackProfile(cleanIntake),
        createdAt: current.createdAt || now,
        updatedAt: now,
      }));
      setPhase("review");
    } finally {
      setLoading(false);
    }
  };

  const saveProfile = async () => {
    setError("");
    const account = await getCurrentAccount();

    if (!account) {
      setError("Sign in or create an account to save setup.");
      return;
    }

    const nextProfile = {
      ...profile,
      updatedAt: new Date().toISOString(),
    };

    await saveOnboardingProfileToAccount(nextProfile);
    saveOnboardingProfile(nextProfile);
    try {
      sessionStorage.removeItem(RETURN_TO_COVER_KEY);
    } catch {
      // Session storage can be unavailable in some privacy modes.
    }
    setSaved(true);
    router.push("/");
  };

  const goBack = () => {
    setError("");
    if (phase === "review") {
      setPhase("intake");
      return;
    }

    try {
      sessionStorage.setItem(RETURN_TO_COVER_KEY, "true");
    } catch {
      // Session storage can be unavailable in some privacy modes.
    }
    router.push("/");
  };

  const toggleSpeech = () => {
    if (!speechSupported) return;

    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }

    const speechWindow = window as SpeechWindow;
    const Recognition =
      speechWindow.SpeechRecognition || speechWindow.webkitSpeechRecognition;

    if (!Recognition) return;

    const recognition = new Recognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";
    speechBaseRef.current = intake.trim();
    recognition.onresult = (event) => {
      let transcript = "";

      for (let index = 0; index < event.results.length; index += 1) {
        transcript += event.results[index][0].transcript;
      }

      setIntake(`${speechBaseRef.current} ${transcript}`.trim());
      setSaved(false);
      setError("");
    };
    recognition.onend = () => setIsListening(false);
    recognitionRef.current = recognition;
    recognition.start();
    setIsListening(true);
  };

  return (
    <main className="container flex min-h-dvh items-center py-6 md:py-12">
      <section className="mx-auto w-full max-w-3xl">
        <div className="aura-glass overflow-hidden rounded-2xl p-5 md:rounded-lg md:p-7">
          <div className="flex items-center justify-between gap-4">
            <p className="text-xs uppercase tracking-[0.24em] text-primary">
              Setup
            </p>
            <span className="inline-flex items-center gap-2 rounded-full border border-primary/14 bg-primary/8 px-3 py-1 text-xs text-muted-foreground">
              <Sparkles className="h-3.5 w-3.5 text-primary" aria-hidden />
              Personal path
            </span>
          </div>

          {phase === "intake" ? (
            <form onSubmit={analyzeIntake} className="mt-8 animate-onboarding-forward">
              <h1 className="font-serif text-4xl font-semibold leading-tight md:text-6xl">
                What do you want?
              </h1>
              <p className="mt-4 max-w-2xl leading-7 text-muted-foreground">
                Talk naturally. ClearPth will shape your desired reality,
                current gap, and guidance style from what you say.
              </p>

              <div className="mt-7">
                <Textarea
                  className="min-h-[220px] text-lg leading-8 md:min-h-[260px]"
                  value={intake}
                  onChange={(event) => {
                    setIntake(event.target.value);
                    setError("");
                    setSaved(false);
                  }}
                  placeholder={starterPrompt}
                  rows={7}
                  autoFocus
                />
              </div>

              <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <Button type="button" variant="secondary" onClick={goBack}>
                  <ArrowLeft className="h-4 w-4" aria-hidden />
                  Back
                </Button>

                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                  <Button
                    type="button"
                    variant="secondary"
                    disabled={!speechSupported}
                    onClick={toggleSpeech}
                    title={
                      speechSupported
                        ? "Speak your setup"
                        : "Voice input is unavailable in this browser"
                    }
                  >
                    {isListening ? (
                      <MicOff className="h-4 w-4" aria-hidden />
                    ) : (
                      <Mic className="h-4 w-4" aria-hidden />
                    )}
                    {isListening ? "Stop" : "Talk"}
                  </Button>
                  <Button type="submit" size="lg" disabled={loading}>
                    {loading ? (
                      <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                    ) : (
                      <ArrowRight className="h-4 w-4" aria-hidden />
                    )}
                    Shape My Path
                  </Button>
                </div>
              </div>
            </form>
          ) : (
            <section className="mt-8 animate-onboarding-forward">
              <h1 className="font-serif text-4xl font-semibold leading-tight md:text-6xl">
                Your path is set.
              </h1>
              <p className="mt-4 max-w-2xl leading-7 text-muted-foreground">
                ClearPth will use this to personalize check-ins, Tune In, and
                guidance around the life you want.
              </p>

              <div className="mt-7 grid gap-3">
                <ProfileCard label="Desired reality" value={profile.primaryGoal} />
                <ProfileCard label="Current gap" value={profile.currentChallenge} />
                <ProfileCard label="State to practice" value={profile.desiredState} />
              </div>

              <button
                type="button"
                className="mt-5 inline-flex items-center gap-2 text-sm text-muted-foreground transition hover:text-foreground"
                onClick={() => setShowDetails((current) => !current)}
              >
                <SlidersHorizontal className="h-4 w-4" aria-hidden />
                {showDetails ? "Hide details" : "Tune details"}
              </button>

              {showDetails ? (
                <div className="mt-5 grid gap-5">
                  <DetailTextarea
                    label="Desired reality"
                    value={profile.primaryGoal}
                    onChange={(value) => updateField("primaryGoal", value)}
                  />
                  <DetailTextarea
                    label="Current gap"
                    value={profile.currentChallenge}
                    onChange={(value) => updateField("currentChallenge", value)}
                  />
                  <DetailTextarea
                    label="State to practice"
                    value={profile.desiredState}
                    onChange={(value) => updateField("desiredState", value)}
                  />
                  <OptionGroup
                    label="Practice style"
                    value={profile.practiceStyle}
                    options={practiceStyles}
                    onChange={(value) => updateField("practiceStyle", value)}
                  />
                  <OptionGroup
                    label="Language"
                    value={profile.spiritualOpenness}
                    options={spiritualOpenness}
                    onChange={(value) => updateField("spiritualOpenness", value)}
                  />
                  <OptionGroup
                    label="Commitment"
                    value={profile.commitmentLevel}
                    options={commitmentLevels}
                    onChange={(value) => updateField("commitmentLevel", value)}
                  />
                  <OptionGroup
                    label="Tone"
                    value={profile.guidanceTone}
                    options={guidanceTones}
                    onChange={(value) => updateField("guidanceTone", value)}
                  />
                </div>
              ) : null}

              <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <Button type="button" variant="secondary" onClick={goBack}>
                  <ArrowLeft className="h-4 w-4" aria-hidden />
                  Edit
                </Button>
                <Button type="button" size="lg" onClick={saveProfile}>
                  Continue
                  <ArrowRight className="h-4 w-4" aria-hidden />
                </Button>
              </div>
            </section>
          )}
        </div>

        <div className="mt-4 min-h-6">
          {error ? <p className="text-sm text-primary">{error}</p> : null}
          {saved ? (
            <p className="inline-flex items-center gap-2 text-sm text-muted-foreground">
              <CheckCircle2 className="h-4 w-4" aria-hidden />
              Saved
            </p>
          ) : null}
        </div>
      </section>
    </main>
  );
}

function ProfileCard({ label, value }: { label: string; value: string }) {
  return (
    <article className="rounded-xl border border-border/55 bg-card/35 p-4">
      <p className="text-[11px] uppercase tracking-[0.18em] text-primary">
        {label}
      </p>
      <p className="mt-2 leading-7 text-foreground/88">{value}</p>
    </article>
  );
}

function DetailTextarea({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block text-sm font-medium text-muted-foreground">
      {label}
      <Textarea
        className="mt-2 min-h-[110px]"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}

function OptionGroup({
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
    <div>
      <p className="text-sm font-medium text-muted-foreground">{label}</p>
      <div className="mt-2 grid gap-2 sm:grid-cols-2">
        {options.map((option) => {
          const selected = value === option;

          return (
            <button
              key={option}
              type="button"
              onClick={() => onChange(option)}
              className={`rounded-lg border px-3 py-3 text-left text-sm transition ${
                selected
                  ? "border-primary/55 bg-primary/15 text-foreground"
                  : "border-border/70 bg-card/35 text-muted-foreground hover:border-foreground/35 hover:text-foreground"
              }`}
            >
              {option}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function buildFallbackProfile(intake: string): OnboardingProfileDraft {
  const trimmed = intake.trim();

  return {
    primaryGoal:
      trimmed || "I want to become more aligned with the life I want.",
    currentChallenge:
      "The current gap needs to be named more clearly through check-ins and reflection.",
    desiredState: "Clear, steady, honest, and aligned.",
    practiceStyle: "Balanced reflection and action",
    spiritualOpenness: "Open, but keep it grounded",
    commitmentLevel: "A few minutes most days",
    guidanceTone: "Direct and grounded",
  };
}

function buildIntakeFromProfile(profile: OnboardingProfile) {
  return [
    profile.primaryGoal,
    profile.currentChallenge,
    profile.desiredState,
  ]
    .filter(Boolean)
    .join("\n\n");
}
