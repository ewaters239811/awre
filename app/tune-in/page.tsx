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
  const [audioPlaying, setAudioPlaying] = useState(false);
  const [audioPaused, setAudioPaused] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [audioStatus, setAudioStatus] = useState<
    "idle" | "loading" | "ready" | "unavailable"
  >("idle");
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const requestedFor = useRef<string | null>(null);

  useEffect(() => {
    queueMicrotask(() => {
      setCheckIn(getCheckInForDate(todayKey));
    });

    return () => {
      if (audioUrl) URL.revokeObjectURL(audioUrl);
      stopAmbientBed();
    };
  }, [todayKey, audioUrl]);

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
            audioRef.current?.pause();
            if (audioRef.current) audioRef.current.currentTime = 0;
            stopAmbientBed();
            setAudioPlaying(false);
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
    audioRef.current?.pause();
    if (audioRef.current) audioRef.current.currentTime = 0;
    stopAmbientBed();
    setAudioPlaying(false);
    setAudioPaused(false);
  };

  const ensureAudioUrl = async () => {
    if (audioUrl) return audioUrl;

    setAudioStatus("loading");
    const response = await fetch("/api/meditation-audio", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: meditation.script }),
    });

    if (!response.ok) {
      setAudioStatus("unavailable");
      throw new Error("Meditation audio is unavailable.");
    }

    const blob = await response.blob();
    const nextUrl = URL.createObjectURL(blob);
    setAudioUrl(nextUrl);
    setAudioStatus("ready");
    return nextUrl;
  };

  const toggleMeditationAudio = async () => {
    if (audioPlaying && !audioPaused) {
      audioRef.current?.pause();
      pauseAmbientBed();
      setAudioPaused(true);
      setTimerRunning(false);
      return;
    }

    if (audioPlaying && audioPaused) {
      await audioRef.current?.play();
      await resumeAmbientBed();
      updateMediaSession("playing", meditation);
      setAudioPaused(false);
      setTimerRunning(true);
      return;
    }

    try {
      const nextUrl = await ensureAudioUrl();
      if (audioRef.current) {
        audioRef.current.src = nextUrl;
        audioRef.current.currentTime = 0;
        await audioRef.current.play();
      }
      await startAmbientBed();
      updateMediaSession("playing", meditation);
      setAudioPlaying(true);
      setAudioPaused(false);
      setTimerRunning(true);
    } catch {
      setTimerRunning(false);
    }
  };

  const stopMeditationAudio = () => {
    audioRef.current?.pause();
    updateMediaSession("paused", meditation);
    if (audioRef.current) audioRef.current.currentTime = 0;
    stopAmbientBed();
    setAudioPlaying(false);
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
            disabled={status === "loading" || audioStatus === "loading"}
            onClick={toggleMeditationAudio}
          >
            {audioPlaying && !audioPaused ? (
              <Pause className="h-4 w-4" aria-hidden />
            ) : (
              <Volume2 className="h-4 w-4" aria-hidden />
            )}
            {audioStatus === "loading"
              ? "Creating Audio"
              : audioPlaying && !audioPaused
              ? "Pause Meditation"
              : audioPaused
                ? "Resume Meditation"
                : "Play Meditation"}
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="lg"
            disabled={!audioPlaying}
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
        {audioStatus === "unavailable" ? (
          <p className="mt-4 rounded-md border border-border/70 bg-card/45 px-4 py-3 text-sm text-muted-foreground">
            ElevenLabs audio is not configured yet. Add your ElevenLabs API key
            to enable realistic generated audio.
          </p>
        ) : null}
        <audio
          ref={audioRef}
          preload="none"
          playsInline
          onPause={() => updateMediaSession("paused", meditation)}
          onPlay={() => updateMediaSession("playing", meditation)}
          onTimeUpdate={(event) => {
            const audio = event.currentTarget;
            if (!Number.isFinite(audio.duration) || audio.duration <= 0) return;

            setRemainingSeconds(
              Math.max(Math.ceil(audio.duration - audio.currentTime), 0),
            );
          }}
          onEnded={() => {
            stopAmbientBed();
            updateMediaSession("none", meditation);
            setAudioPlaying(false);
            setAudioPaused(false);
            setTimerRunning(false);
          }}
          onError={() => {
            stopAmbientBed();
            updateMediaSession("none", meditation);
            setAudioStatus("unavailable");
            setAudioPlaying(false);
            setAudioPaused(false);
            setTimerRunning(false);
          }}
        />
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

function updateMediaSession(
  playbackState: MediaSessionPlaybackState,
  meditation: AiMeditation,
) {
  if (typeof navigator === "undefined" || !("mediaSession" in navigator)) {
    return;
  }

  navigator.mediaSession.metadata = new MediaMetadata({
    title: meditation.title,
    artist: "ClearPth",
    album: "Tune In",
  });
  navigator.mediaSession.playbackState = playbackState;

  navigator.mediaSession.setActionHandler("play", () => {
    document.querySelector("audio")?.play().catch(() => undefined);
    navigator.mediaSession.playbackState = "playing";
  });
  navigator.mediaSession.setActionHandler("pause", () => {
    document.querySelector("audio")?.pause();
    navigator.mediaSession.playbackState = "paused";
  });
  navigator.mediaSession.setActionHandler("stop", () => {
    const audio = document.querySelector("audio");
    if (audio) {
      audio.pause();
      audio.currentTime = 0;
    }
    navigator.mediaSession.playbackState = "none";
  });
}

async function startAmbientBed() {
  const AudioContextConstructor =
    window.AudioContext ||
    (window as Window & { webkitAudioContext?: typeof AudioContext })
      .webkitAudioContext;

  if (!AudioContextConstructor) return;

  if (!ambientContextRefGlobal.context) {
    const context = new AudioContextConstructor();
    const gain = context.createGain();
    gain.gain.setValueAtTime(0.0001, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.035, context.currentTime + 2.2);
    gain.connect(context.destination);

    const frequencies = [110, 165, 220];
    const oscillators = frequencies.map((frequency, index) => {
      const oscillator = context.createOscillator();
      const filter = context.createBiquadFilter();
      const oscillatorGain = context.createGain();

      oscillator.type = index === 1 ? "triangle" : "sine";
      oscillator.frequency.value = frequency;
      oscillator.detune.value = index === 0 ? -7 : index === 1 ? 5 : 11;
      filter.type = "lowpass";
      filter.frequency.value = 520;
      oscillatorGain.gain.value = index === 1 ? 0.38 : 0.28;

      oscillator.connect(filter);
      filter.connect(oscillatorGain);
      oscillatorGain.connect(gain);
      oscillator.start();

      return oscillator;
    });

    ambientContextRefGlobal.context = context;
    ambientContextRefGlobal.gain = gain;
    ambientContextRefGlobal.oscillators = oscillators;
  }

  if (ambientContextRefGlobal.context.state === "suspended") {
    await ambientContextRefGlobal.context.resume();
  }
}

function pauseAmbientBed() {
  ambientContextRefGlobal.context?.suspend().catch(() => undefined);
}

async function resumeAmbientBed() {
  await ambientContextRefGlobal.context?.resume().catch(() => undefined);
}

function stopAmbientBed() {
  const context = ambientContextRefGlobal.context;
  const gain = ambientContextRefGlobal.gain;

  if (!context) return;

  try {
    if (gain) {
      gain.gain.cancelScheduledValues(context.currentTime);
      gain.gain.setValueAtTime(Math.max(gain.gain.value, 0.0001), context.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.8);
    }

    window.setTimeout(() => {
      ambientContextRefGlobal.oscillators.forEach((oscillator) => {
        try {
          oscillator.stop();
        } catch {
          // The oscillator may already be stopped by cleanup.
        }
      });
      context.close().catch(() => undefined);
      ambientContextRefGlobal.context = null;
      ambientContextRefGlobal.gain = null;
      ambientContextRefGlobal.oscillators = [];
    }, 850);
  } catch {
    context.close().catch(() => undefined);
    ambientContextRefGlobal.context = null;
    ambientContextRefGlobal.gain = null;
    ambientContextRefGlobal.oscillators = [];
  }
}

const ambientContextRefGlobal: {
  context: AudioContext | null;
  gain: GainNode | null;
  oscillators: OscillatorNode[];
} = {
  context: null,
  gain: null,
  oscillators: [],
};

function formatTime(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const remainder = String(seconds % 60).padStart(2, "0");
  return `${minutes}:${remainder}`;
}
