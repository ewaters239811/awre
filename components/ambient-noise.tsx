"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Volume2, VolumeX } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  getAmbientSoundEnabled,
  setAmbientSoundEnabled,
  subscribeAmbientSound,
} from "@/lib/ambient-sound";

type PlaybackState = "ready" | "playing" | "muted" | "unavailable";
type Tone = {
  context: AudioContext;
  oscillator: OscillatorNode;
  gain: GainNode;
};

export function AmbientNoise() {
  const tone = useRef<Tone | null>(null);
  const [playback, setPlayback] = useState<PlaybackState>("ready");

  const stopTone = useCallback((fade = false) => {
    const current = tone.current;
    if (!current) return;
    tone.current = null;
    current.context.onstatechange = null;
    const close = () => { void current.context.close().catch(() => undefined); };

    if (fade && current.context.state === "running") {
      const now = current.context.currentTime;
      current.gain.gain.cancelScheduledValues(now);
      current.gain.gain.setTargetAtTime(0, now, 0.025);
      current.oscillator.onended = close;
      current.oscillator.stop(now + 0.15);
    } else {
      close();
    }
  }, []);

  const startTone = useCallback((resume: boolean) => {
    if (!getAmbientSoundEnabled()) return;

    try {
      if (!tone.current) {
        const AudioContextConstructor = window.AudioContext ??
          (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        if (!AudioContextConstructor) {
          setPlayback("unavailable");
          return;
        }

        const context = new AudioContextConstructor();
        const gain = context.createGain();
        const oscillator = context.createOscillator();
        tone.current = { context, oscillator, gain };
        oscillator.type = "sine";
        oscillator.frequency.value = 432;
        gain.gain.setValueAtTime(0, context.currentTime);
        gain.gain.linearRampToValueAtTime(0.025, context.currentTime + 2);
        oscillator.connect(gain);
        gain.connect(context.destination);
        context.onstatechange = () => {
          if (tone.current?.context === context) {
            setPlayback(context.state === "running" ? "playing" : "ready");
          }
        };
        oscillator.start();
      }

      const { context } = tone.current;
      setPlayback(context.state === "running" ? "playing" : "ready");
      if (resume && context.state !== "running") {
        void context.resume().catch(() => {
          if (tone.current?.context === context) setPlayback("ready");
        });
      }
    } catch {
      stopTone();
      setPlayback("unavailable");
    }
  }, [stopTone]);

  useEffect(() => {
    let active = true;
    const updatePreference = (resume: boolean) => {
      if (getAmbientSoundEnabled()) {
        startTone(resume);
      } else {
        stopTone(true);
        setPlayback("muted");
      }
    };

    queueMicrotask(() => {
      if (active) updatePreference(false);
    });
    const unlock = () => startTone(true);
    const resumeOnReturn = () => {
      if (!document.hidden && tone.current) startTone(true);
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
      stopTone();
    };
  }, [startTone, stopTone]);

  const playing = playback === "playing";
  const label = playback === "unavailable"
    ? "432 Hz ambient sound unavailable"
    : playing ? "Mute 432 Hz ambient sound" : "Play 432 Hz ambient sound";
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
