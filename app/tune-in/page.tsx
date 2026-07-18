"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  CheckCircle2,
  Headphones,
  Pause,
  RefreshCw,
  Square,
  Volume2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { saveCheckInToAccount } from "@/lib/account-data";
import { getCheckInForDate, updateCheckIn } from "@/lib/alignment";
import { getOnboardingProfile } from "@/lib/onboarding-storage";
import { useCurrentCheckInDateKey } from "@/lib/use-current-check-in-date-key";
import type { AiMeditation, CheckInResult } from "@/lib/types";

type MeditationStatus = "idle" | "loading" | "ready" | "unavailable";

const fallbackMeditation: AiMeditation = {
  title: "Return To The Center",
  intention: "Bring today back into one clear line.",
  durationSeconds: 300,
  script:
    "Sit comfortably and let the body become still. Let the shoulders drop. Let the jaw soften. Take one slow breath in, and one slower breath out. Notice the state you brought with you. You do not have to fix it by force. You only have to meet it honestly. Let the thought that has been loudest become simple. Beneath the noise, there is one cleaner sentence available. Let that sentence be: I can return to myself and choose one true step. Now bring attention to the part of you that acts. If action has been delayed, do not make it a verdict on who you are. Let it become energy waiting for direction. See one small action becoming visible and complete. Feel how the body changes when the next step is no longer dramatic. Now notice the feeling running underneath the day. Let it be present, but let it release command. Breathe as if your desired state is already safe to practice now. For the final breaths, gather thought, action, and feeling into one line. One clear thought. One honest action. One steadier feeling. When you open your eyes, carry that line into the next moment.",
  closingPrompt: "What one step would make this state visible today?",
};

export default function TuneInPage() {
  const todayKey = useCurrentCheckInDateKey();
  const [checkIn, setCheckIn] = useState<CheckInResult | null>(null);
  const [status, setStatus] = useState<MeditationStatus>("idle");
  const [remainingSeconds, setRemainingSeconds] = useState(300);
  const [timerRunning, setTimerRunning] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [audioPaused, setAudioPaused] = useState(false);
  const [voiceReady, setVoiceReady] = useState(false);
  const requestedFor = useRef<string | null>(null);

  useEffect(() => {
    queueMicrotask(() => {
      setCheckIn(getCheckInForDate(todayKey));
      setVoiceReady("speechSynthesis" in window);
    });

    const loadVoices = () => setVoiceReady(true);
    window.speechSynthesis?.addEventListener("voiceschanged", loadVoices);

    return () => {
      window.speechSynthesis?.cancel();
      window.speechSynthesis?.removeEventListener("voiceschanged", loadVoices);
    };
  }, [todayKey]);

  const contextSignature = useMemo(() => {
    if (!checkIn) return "";

    return [
      checkIn.id,
      checkIn.createdAt,
      checkIn.thinkingScore,
      checkIn.willingScore,
      checkIn.feelingScore,
      checkIn.dominantThought,
      checkIn.avoidedAction,
      checkIn.currentFeeling,
      checkIn.highestBeingChoice,
    ].join("|");
  }, [checkIn]);

  const meditation = checkIn?.aiMeditation ?? fallbackMeditation;

  useEffect(() => {
    if (!checkIn) return;

    const shouldGenerate =
      !checkIn.aiMeditation ||
      checkIn.aiMeditationContextSignature !== contextSignature;

    if (!shouldGenerate && checkIn.aiMeditation) {
      const savedDuration = Math.min(checkIn.aiMeditation.durationSeconds, 300);
      queueMicrotask(() => {
        setStatus("ready");
        setRemainingSeconds(savedDuration);
      });
      return;
    }

    if (requestedFor.current === `${checkIn.id}:${contextSignature}`) return;
    requestedFor.current = `${checkIn.id}:${contextSignature}`;
    setStatus("loading");

    fetch("/api/meditation", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        result: checkIn,
        onboardingProfile: getOnboardingProfile(),
      }),
    })
      .then((response) => response.json())
      .then((payload: { enabled?: boolean; data?: AiMeditation }) => {
        const nextMeditation = normalizeMeditation(payload.data);
        const updated: CheckInResult = {
          ...checkIn,
          aiMeditation: nextMeditation,
          aiMeditationGeneratedAt: new Date().toISOString(),
          aiMeditationContextSignature: contextSignature,
        };

        updateCheckIn(updated);
        saveCheckInToAccount(updated).catch(() => undefined);
        setCheckIn(updated);
        setRemainingSeconds(nextMeditation.durationSeconds);
        setStatus(payload.enabled === false ? "unavailable" : "ready");
      })
      .catch(() => {
        setStatus("unavailable");
        setRemainingSeconds(fallbackMeditation.durationSeconds);
      });
  }, [checkIn, contextSignature]);

  useEffect(() => {
    if (!timerRunning || remainingSeconds <= 0) return;

    const timer = window.setInterval(() => {
      setRemainingSeconds((current) => {
        const next = Math.max(current - 1, 0);
        if (next === 0) {
          queueMicrotask(() => {
            setTimerRunning(false);
            window.speechSynthesis?.cancel();
            setSpeaking(false);
            setAudioPaused(false);
          });
        }
        return next;
      });
    }, 1000);

    return () => window.clearInterval(timer);
  }, [timerRunning, remainingSeconds]);

  const resetSession = () => {
    setTimerRunning(false);
    setRemainingSeconds(Math.min(meditation.durationSeconds, 300));
    window.speechSynthesis?.cancel();
    setSpeaking(false);
    setAudioPaused(false);
  };

  const toggleMeditationAudio = () => {
    if (!("speechSynthesis" in window)) return;

    if (speaking && !audioPaused) {
      window.speechSynthesis.pause();
      setAudioPaused(true);
      setTimerRunning(false);
      return;
    }

    if (speaking && audioPaused) {
      window.speechSynthesis.resume();
      setAudioPaused(false);
      setTimerRunning(true);
      return;
    }

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(meditation.script);
    const softVoice = getSoftFeminineVoice();
    if (softVoice) {
      utterance.voice = softVoice;
      utterance.lang = softVoice.lang;
    }
    utterance.rate = 0.74;
    utterance.pitch = 1.08;
    utterance.volume = 0.95;
    utterance.onend = () => {
      setSpeaking(false);
      setAudioPaused(false);
      setTimerRunning(false);
    };
    utterance.onerror = () => {
      setSpeaking(false);
      setAudioPaused(false);
      setTimerRunning(false);
    };

    setSpeaking(true);
    setAudioPaused(false);
    setTimerRunning(true);
    window.speechSynthesis.speak(utterance);
  };

  const stopMeditationAudio = () => {
    window.speechSynthesis?.cancel();
    setSpeaking(false);
    setAudioPaused(false);
    setTimerRunning(false);
  };

  if (!checkIn) {
    return (
      <main className="container py-7 md:py-12">
        <section className="aura-glass mx-auto max-w-4xl rounded-2xl p-6 md:rounded-lg md:p-8">
          <p className="clearpth-page-kicker">Tune In</p>
          <h1 className="clearpth-page-title">Create today&apos;s signal first.</h1>
          <p className="mt-4 max-w-2xl text-[15px] leading-7 text-muted-foreground">
            Your meditation is tailored from today&apos;s check-in. Complete the
            check-in first, then return here for a guided session.
          </p>
          <Button asChild className="mt-6">
            <Link href="/check-in">Begin Check In</Link>
          </Button>
        </section>
      </main>
    );
  }

  const progress =
    100 - Math.round((remainingSeconds / Math.min(meditation.durationSeconds, 300)) * 100);

  return (
    <main className="container py-7 md:py-12">
      <section className="mx-auto max-w-5xl">
        <p className="clearpth-page-kicker">Tune In</p>
        <h1 className="clearpth-page-title">Today&apos;s Meditation</h1>
        <p className="mt-4 max-w-2xl text-[15px] leading-7 text-muted-foreground md:text-base">
          A short guided session shaped by today&apos;s check-in. Five minutes
          or less, built to bring your state back into one line.
        </p>
      </section>

      <section className="aura-glass mx-auto mt-7 max-w-5xl rounded-2xl p-5 md:rounded-lg md:p-8">
        <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-primary/25 bg-primary/10 text-primary md:rounded-md">
                <Headphones className="h-5 w-5" aria-hidden />
              </span>
              <p className="text-[11px] uppercase tracking-[0.18em] text-primary md:text-xs md:tracking-[0.24em]">
                {status === "loading" ? "Preparing" : "Guided Session"}
              </p>
            </div>
            <h2 className="mt-4 font-serif text-3xl font-semibold leading-tight md:text-5xl">
              {meditation.title}
            </h2>
            <p className="mt-4 max-w-2xl text-[15px] leading-7 text-muted-foreground">
              {meditation.intention}
            </p>
          </div>

          <div className="rounded-2xl border border-border/65 bg-card/40 p-4 text-center md:min-w-44 md:rounded-md">
            <p className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
              Time
            </p>
            <p className="mt-2 font-serif text-4xl font-semibold text-primary">
              {formatTime(remainingSeconds)}
            </p>
          </div>
        </div>

        <div className="mt-7 h-2 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-primary transition-all"
            style={{ width: `${Math.max(0, Math.min(progress, 100))}%` }}
          />
        </div>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <Button
            type="button"
            size="lg"
            disabled={status === "loading" || !voiceReady}
            onClick={toggleMeditationAudio}
          >
            {speaking && !audioPaused ? (
              <Pause className="h-4 w-4" aria-hidden />
            ) : (
              <Volume2 className="h-4 w-4" aria-hidden />
            )}
            {speaking && !audioPaused
              ? "Pause Meditation"
              : audioPaused
                ? "Resume Meditation"
                : "Play Meditation"}
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="lg"
            disabled={!speaking}
            onClick={stopMeditationAudio}
          >
            <Square className="h-4 w-4" aria-hidden />
            Stop
          </Button>
          <Button type="button" variant="secondary" size="lg" onClick={resetSession}>
            <RefreshCw className="h-4 w-4" aria-hidden />
            Reset
          </Button>
        </div>

        {status === "unavailable" ? (
          <p className="mt-4 rounded-md border border-border/70 bg-card/45 px-4 py-3 text-sm text-muted-foreground">
            The tailored session is using the fallback meditation for now.
          </p>
        ) : null}
        {!voiceReady ? (
          <p className="mt-4 rounded-md border border-border/70 bg-card/45 px-4 py-3 text-sm text-muted-foreground">
            Preparing your device&apos;s meditation voice.
          </p>
        ) : null}
      </section>

      <section className="mx-auto mt-6 grid max-w-5xl gap-5 lg:grid-cols-[1.15fr_0.85fr]">
        <article className="rounded-2xl border border-border/60 bg-card/30 p-5 md:rounded-md md:p-6">
          <p className="text-[11px] uppercase tracking-[0.18em] text-primary md:text-xs md:tracking-[0.24em]">
            Script
          </p>
          <p className="mt-4 whitespace-pre-line text-[15px] leading-8 text-muted-foreground md:text-base md:leading-8">
            {meditation.script}
          </p>
        </article>

        <aside className="rounded-2xl border border-primary/20 bg-primary/10 p-5 md:rounded-md md:p-6">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="h-5 w-5 text-primary" aria-hidden />
            <p className="text-[11px] uppercase tracking-[0.18em] text-primary md:text-xs md:tracking-[0.24em]">
              After
            </p>
          </div>
          <p className="mt-4 font-serif text-2xl font-semibold leading-tight">
            {meditation.closingPrompt}
          </p>
          <Button asChild className="mt-5 w-full" variant="secondary">
            <Link href="/ritual">Write Journal</Link>
          </Button>
        </aside>
      </section>
    </main>
  );
}

function normalizeMeditation(value?: AiMeditation) {
  if (!value) return fallbackMeditation;

  return {
    title: value.title?.trim() || fallbackMeditation.title,
    intention: value.intention?.trim() || fallbackMeditation.intention,
    durationSeconds: Math.min(Math.max(value.durationSeconds || 300, 60), 300),
    script: value.script?.trim() || fallbackMeditation.script,
    closingPrompt: value.closingPrompt?.trim() || fallbackMeditation.closingPrompt,
  };
}

function getSoftFeminineVoice() {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) {
    return null;
  }

  const voices = window.speechSynthesis.getVoices();
  if (!voices.length) return null;

  const preferredNames = [
    "Samantha",
    "Ava",
    "Allison",
    "Susan",
    "Victoria",
    "Karen",
    "Moira",
    "Tessa",
    "Zira",
    "Jenny",
    "Aria",
    "Michelle",
    "Serena",
    "Female",
  ];

  return (
    preferredNames
      .map((name) =>
        voices.find((voice) =>
          voice.name.toLowerCase().includes(name.toLowerCase()),
        ),
      )
      .find(Boolean) ??
    voices.find(
      (voice) =>
        voice.lang.toLowerCase().startsWith("en") &&
        /female|woman|samantha|ava|allison|susan|victoria|serena|zira|jenny|aria/i.test(
          voice.name,
        ),
    ) ??
    voices.find((voice) => voice.lang.toLowerCase().startsWith("en")) ??
    voices[0]
  );
}

function formatTime(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const remainder = String(seconds % 60).padStart(2, "0");
  return `${minutes}:${remainder}`;
}
