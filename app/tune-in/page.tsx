"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import {
  Headphones,
  Pause,
  RefreshCw,
  Square,
  Volume2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { saveCheckInToAccount } from "@/lib/account-data";
import { getCheckInForDate, updateCheckIn } from "@/lib/alignment";
import { markMeditationCompleted } from "@/lib/meditation-storage";
import { getOnboardingProfile } from "@/lib/onboarding-storage";
import { useCurrentCheckInDateKey } from "@/lib/use-current-check-in-date-key";
import type { AiMeditation, CheckInResult } from "@/lib/types";

type MeditationStatus = "idle" | "loading" | "ready" | "unavailable";

const fallbackMeditation: AiMeditation = {
  title: "Return To The Desired State",
  intention: "Let the noise settle until the state that matches what you want can be felt.",
  durationSeconds: 300,
  script:
    "Let the body become still. Let the shoulders drop. Let the jaw soften. Take one slow breath in, and one slower breath out. Notice the state you brought with you. You do not have to fix it by force. You only have to meet it honestly. Let the thought that has been loudest become simple. Beneath the noise, there is a clearer knowing available. Let that knowing arrive without pressure. Now bring attention to the part of you that wants life to feel more aligned. Do not push it. Let it become quiet enough to be understood. Feel your feet. Feel your hands. Feel the center of the chest. Let the body learn steadiness before the day asks anything from you. If something has felt unclear, do not make it a verdict on who you are. See it as a signal asking to be listened to. Let the feeling underneath the day be present without letting it take command. Breathe as if your desired state is already allowed in the body. You are not waiting for the outside world to give you permission to become steady. You are practicing the state now. For the final breaths, gather thought, feeling, and desire into one quiet center. Let the body remember what is true. When you are ready, return with more space around the day.",
  closingPrompt: "What feels clearer now?",
};

export default function TuneInPage() {
  const todayKey = useCurrentCheckInDateKey();
  const [checkIn, setCheckIn] = useState<CheckInResult | null>(null);
  const [status, setStatus] = useState<MeditationStatus>("idle");
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [audioDurationSeconds, setAudioDurationSeconds] = useState<number | null>(
    null,
  );
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
      queueMicrotask(() => {
        setStatus("ready");
        setElapsedSeconds(0);
        setAudioDurationSeconds(null);
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
        setElapsedSeconds(0);
        setAudioDurationSeconds(null);
        setStatus(payload.enabled === false ? "unavailable" : "ready");
      })
      .catch(() => {
        setStatus("unavailable");
        setElapsedSeconds(0);
        setAudioDurationSeconds(null);
      });
  }, [checkIn, contextSignature]);

  useEffect(() => {
    const sessionDuration = getSessionDurationSeconds(
      meditation,
      audioDurationSeconds,
    );

    if (
      !timerRunning ||
      audioPlaying ||
      elapsedSeconds >= sessionDuration
    ) {
      return;
    }

    const timer = window.setInterval(() => {
      setElapsedSeconds((current) => {
        const next = Math.min(current + 1, sessionDuration);
        if (next >= sessionDuration) {
          queueMicrotask(() => {
            setTimerRunning(false);
            audioRef.current?.pause();
            if (audioRef.current) audioRef.current.currentTime = 0;
            stopAmbientBed();
            setAudioPlaying(false);
            setAudioPaused(false);
            markMeditationCompleted(todayKey);
          });
        }
        return next;
      });
    }, 1000);

    return () => window.clearInterval(timer);
  }, [
    timerRunning,
    audioPlaying,
    elapsedSeconds,
    meditation,
    audioDurationSeconds,
    todayKey,
  ]);

  const resetSession = () => {
    setTimerRunning(false);
    setElapsedSeconds(0);
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
      setElapsedSeconds(0);
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
    setElapsedSeconds(0);
    setAudioPlaying(false);
    setAudioPaused(false);
    setTimerRunning(false);
  };

  if (!checkIn) {
    return (
      <main className="clearpth-page-shell">
        <section className="aura-glass mx-auto max-w-4xl rounded-[1.35rem] p-5 md:rounded-lg md:p-8">
          <p className="clearpth-page-kicker">Tune In</p>
          <h1 className="clearpth-page-title">Check in first.</h1>
          <p className="mt-4 max-w-2xl text-[15px] leading-7 text-muted-foreground">
            Your Tune In is based on today&apos;s check-in. Complete the
            check-in first, then return here.
          </p>
          <Button asChild className="mt-6">
            <Link href="/check-in">Begin Check In</Link>
          </Button>
        </section>
      </main>
    );
  }

  const sessionDuration = getSessionDurationSeconds(
    meditation,
    audioDurationSeconds,
  );
  const progress = Math.round((elapsedSeconds / sessionDuration) * 100);
  const listeningState = getListeningState({
    audioStatus,
    audioPlaying,
    audioPaused,
    progress,
    status,
  });

  return (
    <main className="container flex min-h-[calc(100dvh-7rem)] items-center justify-center py-8 md:min-h-[calc(100vh-5rem)] md:py-14">
      <section className="relative mx-auto w-full max-w-3xl text-center">
        <div className="pointer-events-none absolute inset-x-0 top-10 mx-auto h-72 w-72 rounded-full bg-primary/10 blur-3xl" />
        <p className="clearpth-page-kicker">Tune In</p>
        <h1 className="mt-3 font-serif text-[2.55rem] font-semibold leading-[1.02] text-foreground sm:text-6xl">
          Your Tune In
        </h1>
        <p className="mt-3 text-sm text-muted-foreground">
          A personal session for returning to the state that matches what you want.
        </p>

        <div className="aura-glass clearpth-meditation-stage mx-auto mt-9 rounded-[2rem] px-5 py-10 sm:px-8 sm:py-12">
          <button
            type="button"
            className={`clearpth-breath-orb mx-auto flex h-52 w-52 items-center justify-center rounded-full outline-none transition focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-wait disabled:opacity-80 sm:h-64 sm:w-64 ${
              audioPlaying && !audioPaused ? "is-listening" : ""
            }`}
            disabled={status === "loading" || audioStatus === "loading"}
            onClick={toggleMeditationAudio}
            style={
              {
                "--meditation-progress": `${Math.max(
                  0,
                  Math.min(progress, 100),
                )}%`,
              } as CSSProperties
            }
            aria-label={getTuneInControlLabel({
              audioPlaying,
              audioPaused,
              audioStatus,
            })}
          >
            <div className="relative z-10 text-center">
              {audioPlaying && !audioPaused ? (
                <Pause className="mx-auto h-9 w-9 text-primary/90" aria-hidden />
              ) : audioPaused ? (
                <Volume2 className="mx-auto h-9 w-9 text-primary/90" aria-hidden />
              ) : (
                <Headphones className="mx-auto h-9 w-9 text-primary/90" aria-hidden />
              )}
              <p className="mt-5 px-8 font-serif text-2xl font-semibold leading-tight text-foreground sm:text-3xl">
                {listeningState.message}
              </p>
            </div>
          </button>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <button
              type="button"
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-primary/16 bg-card/24 px-6 text-sm font-medium text-muted-foreground shadow-[inset_0_1px_0_rgba(244,239,228,0.06)] backdrop-blur-xl transition hover:border-primary/30 hover:bg-card/38 hover:text-foreground disabled:pointer-events-none disabled:opacity-35"
              disabled={!audioPlaying}
              onClick={stopMeditationAudio}
            >
              <Square className="h-4 w-4" aria-hidden />
              Stop
            </button>
            <button
              type="button"
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-primary/16 bg-card/24 px-6 text-sm font-medium text-muted-foreground shadow-[inset_0_1px_0_rgba(244,239,228,0.06)] backdrop-blur-xl transition hover:border-primary/30 hover:bg-card/38 hover:text-foreground"
              onClick={resetSession}
            >
              <RefreshCw className="h-4 w-4" aria-hidden />
              Reset
            </button>
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

            setAudioDurationSeconds(Math.ceil(audio.duration));
            setElapsedSeconds(Math.floor(audio.currentTime));
          }}
          onEnded={() => {
            stopAmbientBed();
            updateMediaSession("none", meditation);
            markMeditationCompleted(todayKey);
            if (audioRef.current?.duration && Number.isFinite(audioRef.current.duration)) {
              setElapsedSeconds(Math.ceil(audioRef.current.duration));
            }
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
        </div>
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

function getSessionDurationSeconds(
  meditation: AiMeditation,
  audioDurationSeconds: number | null,
) {
  return Math.max(
    audioDurationSeconds ?? Math.min(meditation.durationSeconds, 300),
    1,
  );
}

function getListeningState({
  audioStatus,
  audioPlaying,
  audioPaused,
  progress,
  status,
}: {
  audioStatus: "idle" | "loading" | "ready" | "unavailable";
  audioPlaying: boolean;
  audioPaused: boolean;
  progress: number;
  status: MeditationStatus;
}) {
  if (status === "loading" || audioStatus === "loading") {
    return {
      message: "Preparing",
    };
  }

  if (progress >= 100) {
    return {
      message: "Stillness",
    };
  }

  if (audioPlaying && !audioPaused) {
    return {
      message: "Receiving",
    };
  }

  if (audioPaused) {
    return {
      message: "Paused",
    };
  }

  return {
    message: "Ready",
  };
}

function getTuneInControlLabel({
  audioPlaying,
  audioPaused,
  audioStatus,
}: {
  audioPlaying: boolean;
  audioPaused: boolean;
  audioStatus: "idle" | "loading" | "ready" | "unavailable";
}) {
  if (audioStatus === "loading") return "Creating audio";
  if (audioPlaying && !audioPaused) return "Pause tune in";
  if (audioPaused) return "Continue tune in";
  return "Begin tune in";
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
    album: "Meditation",
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
