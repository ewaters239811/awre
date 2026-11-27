"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Volume2, VolumeX } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  getAmbientSoundEnabled,
  setAmbientSoundEnabled,
  subscribeAmbientSound,
} from "@/lib/ambient-sound";
import { getMeditationLoop } from "@/lib/meditation-loop";

type PlaybackState = "ready" | "playing" | "muted" | "unavailable";
type AmbientPlayback = {
  context: AudioContext;
  source: AudioBufferSourceNode;
  output: GainNode;
};

function createMeditationSound(context: AudioContext): AmbientPlayback {
  const output = context.createGain();
  output.gain.value = 0;
  output.connect(context.destination);

  const source = context.createBufferSource();
  source.buffer = getMeditationLoop(context);
  source.loop = true;
  source.connect(output);
  const now = context.currentTime;
  output.gain.setTargetAtTime(0.1, now, 0.45);
  source.start(now);
  return { context, source, output };
}

export function AmbientNoise() {
  const sound = useRef<AmbientPlayback | null>(null);
  const [playback, setPlayback] = useState<PlaybackState>("ready");

  const stopSound = useCallback((fade = false) => {
    const current = sound.current;
    if (!current) return;
    sound.current = null;
    current.context.onstatechange = null;
    const close = () => { void current.context.close().catch(() => undefined); };

    if (fade && current.context.state === "running") {
      const now = current.context.currentTime;
      current.output.gain.setTargetAtTime(0, now, 0.025);
      current.source.onended = close;
      current.source.stop(now + 0.15);
    } else {
      close();
    }
  }, []);

  const startSound = useCallback((resume: boolean) => {
    if (!getAmbientSoundEnabled()) return;

    try {
      if (!sound.current) {
        const AudioContextConstructor = window.AudioContext ??
          (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        if (!AudioContextConstructor) {
          setPlayback("unavailable");
          return;
        }

        const context = new AudioContextConstructor();
        try {
          sound.current = createMeditationSound(context);
        } catch (error) {
          void context.close().catch(() => undefined);
          throw error;
        }
        context.onstatechange = () => {
          if (sound.current?.context === context) {
            setPlayback(context.state === "running" ? "playing" : "ready");
          }
        };
      }

      const { context } = sound.current;
      setPlayback(context.state === "running" ? "playing" : "ready");
      if (resume && context.state !== "running") {
        void context.resume().catch(() => {
          if (sound.current?.context === context) setPlayback("ready");
        });
      }
    } catch {
      stopSound();
      setPlayback("unavailable");
    }
  }, [stopSound]);

  useEffect(() => {
    let active = true;
    const updatePreference = (resume: boolean) => {
      if (getAmbientSoundEnabled()) {
        startSound(resume);
      } else {
        stopSound(true);
        setPlayback("muted");
      }
    };

    queueMicrotask(() => {
      if (active) updatePreference(false);
    });
    const unlock = () => startSound(true);
    const resumeOnReturn = () => {
      if (!document.hidden && sound.current) startSound(true);
    };
    const unsubscribe = subscribeAmbientSound(() => updatePreference(true));
    window.addEventListener("click", unlock);
    window.addEventListener("keydown", unlock);
    document.addEventListener("visibilitychange", resumeOnReturn);
    window.addEventListener("pageshow", resumeOnReturn);

    return () => {
      active = false;
      unsubscribe();
      window.removeEventListener("click", unlock);
      window.removeEventListener("keydown", unlock);
      document.removeEventListener("visibilitychange", resumeOnReturn);
      window.removeEventListener("pageshow", resumeOnReturn);
      stopSound();
    };
  }, [startSound, stopSound]);

  const playing = playback === "playing";
  const label = playback === "unavailable"
    ? "Meditation sound unavailable"
    : playing ? "Mute meditation sound" : "Play meditation sound";
  const Icon = playing ? Volume2 : VolumeX;

  return (
    <div className="fixed right-16 top-2.5 z-50 lg:bottom-4 lg:right-4 lg:top-auto">
      <Button
        type="button"
        variant="secondary"
        size="icon"
        className="h-11 w-11 rounded-full border border-primary/25 bg-background/75 shadow-2xl backdrop-blur-xl"
        onClick={() => setAmbientSoundEnabled(!playing)}
        disabled={playback === "unavailable"}
        title={label}
        aria-label={label}
        aria-pressed={playing}
      >
        <Icon className="h-4 w-4 text-primary" aria-hidden />
      </Button>
    </div>
  );
}
