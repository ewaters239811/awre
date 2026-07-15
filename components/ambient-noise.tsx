"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { Volume2, VolumeX } from "lucide-react";
import { Button } from "@/components/ui/button";

const AUDIO_CHOICE_KEY = "clearpth.ambientNoise.enabled";

type AudioState = "starting" | "blocked" | "playing" | "muted";

export function AmbientNoise() {
  const pathname = usePathname();
  const audioContext = useRef<AudioContext | null>(null);
  const nodes = useRef<AudioNode[]>([]);
  const stopHandles = useRef<Array<() => void>>([]);
  const [audioState, setAudioState] = useState<AudioState>("starting");

  const stopNoise = useCallback(() => {
    stopHandles.current.forEach((stop) => stop());
    stopHandles.current = [];
    nodes.current = [];
    audioContext.current?.close().catch(() => undefined);
    audioContext.current = null;
  }, []);

  const resumeExistingContext = useCallback(async (context: AudioContext) => {
    try {
      if (context.state === "suspended") {
        await context.resume();
      }

      setAudioState(context.state === "running" ? "playing" : "blocked");
    } catch {
      setAudioState("blocked");
    }
  }, []);

  const startNoise = useCallback(async () => {
    if (audioContext.current) {
      await resumeExistingContext(audioContext.current);
      return;
    }

    const AudioContextConstructor =
      window.AudioContext ??
      (window as Window & { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;

    if (!AudioContextConstructor) {
      setAudioState("blocked");
      return;
    }

    const context = new AudioContextConstructor();
    const masterGain = context.createGain();
    masterGain.gain.value = 0.026;
    masterGain.connect(context.destination);

    const padGain = context.createGain();
    padGain.gain.value = 0.48;
    padGain.connect(masterGain);

    const shimmerGain = context.createGain();
    shimmerGain.gain.value = 0.055;
    shimmerGain.connect(masterGain);

    const airGain = context.createGain();
    airGain.gain.value = 0.018;
    airGain.connect(masterGain);

    const breathLfo = context.createOscillator();
    const breathGain = context.createGain();
    breathLfo.type = "sine";
    breathLfo.frequency.value = 0.045;
    breathGain.gain.value = 0.0025;
    breathLfo.connect(breathGain);
    breathGain.connect(masterGain.gain);
    breathLfo.start();

    const lowPass = context.createBiquadFilter();
    lowPass.type = "lowpass";
    lowPass.frequency.value = 620;
    lowPass.Q.value = 0.3;

    const highPass = context.createBiquadFilter();
    highPass.type = "highpass";
    highPass.frequency.value = 90;

    const bufferSize = context.sampleRate * 4;
    const buffer = context.createBuffer(1, bufferSize, context.sampleRate);
    const output = buffer.getChannelData(0);

    for (let index = 0; index < bufferSize; index += 1) {
      output[index] = (Math.random() * 2 - 1) * 0.045;
    }

    const airSource = context.createBufferSource();
    airSource.buffer = buffer;
    airSource.loop = true;
    airSource.connect(highPass);
    highPass.connect(lowPass);
    lowPass.connect(airGain);
    airSource.start();

    const frequencies = [108, 162, 216, 324];
    frequencies.forEach((frequency, index) => {
      const oscillator = context.createOscillator();
      const toneGain = context.createGain();
      const lfo = context.createOscillator();
      const lfoGain = context.createGain();

      oscillator.type = "sine";
      oscillator.frequency.value = frequency;
      toneGain.gain.value = index === 0 ? 0.18 : 0.08;
      lfo.type = "sine";
      lfo.frequency.value = 0.035 + index * 0.012;
      lfoGain.gain.value = 0.035;

      lfo.connect(lfoGain);
      lfoGain.connect(toneGain.gain);
      oscillator.connect(toneGain);
      toneGain.connect(padGain);

      oscillator.start();
      lfo.start();

      stopHandles.current.push(() => {
        oscillator.stop();
        lfo.stop();
      });
      nodes.current.push(oscillator, toneGain, lfo, lfoGain);
    });

    [432, 648].forEach((frequency, index) => {
      const oscillator = context.createOscillator();
      const toneGain = context.createGain();

      oscillator.type = "sine";
      oscillator.frequency.value = frequency;
      toneGain.gain.setValueAtTime(0.0001, context.currentTime);
      toneGain.gain.linearRampToValueAtTime(
        index === 0 ? 0.024 : 0.014,
        context.currentTime + 8,
      );
      oscillator.connect(toneGain);
      toneGain.connect(shimmerGain);
      oscillator.start();

      stopHandles.current.push(() => oscillator.stop());
      nodes.current.push(oscillator, toneGain);
    });

    const playChime = () => {
      if (context.state === "closed") return;

      [432, 648].forEach((frequency, index) => {
        const oscillator = context.createOscillator();
        const chimeGain = context.createGain();

        oscillator.type = "sine";
        oscillator.frequency.value = frequency;
        chimeGain.gain.setValueAtTime(0.0001, context.currentTime);
        chimeGain.gain.exponentialRampToValueAtTime(
          index === 0 ? 0.022 : 0.011,
          context.currentTime + 0.35,
        );
        chimeGain.gain.exponentialRampToValueAtTime(
          0.0001,
          context.currentTime + 7.8,
        );
        oscillator.connect(chimeGain);
        chimeGain.connect(shimmerGain);
        oscillator.start();
        oscillator.stop(context.currentTime + 8);
      });
    };

    const chimeIntroTimer = window.setTimeout(playChime, 18000);
    const chimeTimer = window.setInterval(playChime, 52000);

    audioContext.current = context;
    stopHandles.current.push(() => {
      breathLfo.stop();
      window.clearTimeout(chimeIntroTimer);
      window.clearInterval(chimeTimer);
    });
    stopHandles.current.push(() => airSource.stop());
    nodes.current.push(
      masterGain,
      padGain,
      shimmerGain,
      airGain,
      breathLfo,
      breathGain,
      lowPass,
      highPass,
      airSource,
    );

    await resumeExistingContext(context);
  }, [resumeExistingContext]);

  const enableNoise = useCallback(() => {
    localStorage.setItem(AUDIO_CHOICE_KEY, "true");
    void startNoise();
  }, [startNoise]);

  const muteNoise = useCallback(() => {
    localStorage.setItem(AUDIO_CHOICE_KEY, "false");
    stopNoise();
    setAudioState("muted");
  }, [stopNoise]);

  useEffect(() => {
    const savedChoice = localStorage.getItem(AUDIO_CHOICE_KEY);

    if (savedChoice !== "true") {
      queueMicrotask(() => setAudioState("muted"));
      return undefined;
    }

    queueMicrotask(() => {
      void startNoise();
    });

    const unlockAudio = () => {
      if (localStorage.getItem(AUDIO_CHOICE_KEY) === "true") {
        void startNoise();
      }
    };

    window.addEventListener("pointerdown", unlockAudio, { once: true });
    window.addEventListener("touchstart", unlockAudio, { once: true });
    window.addEventListener("keydown", unlockAudio, { once: true });

    return () => {
      window.removeEventListener("pointerdown", unlockAudio);
      window.removeEventListener("touchstart", unlockAudio);
      window.removeEventListener("keydown", unlockAudio);
      stopNoise();
    };
  }, [startNoise, stopNoise]);

  if (pathname === "/" || pathname === "/login" || pathname === "/onboarding") {
    return null;
  }

  return (
    <div className="fixed right-16 top-2.5 z-50 lg:bottom-4 lg:right-4 lg:top-auto">
      {audioState === "playing" ? (
        <Button
          type="button"
          variant="secondary"
          size="icon"
          className="h-11 w-11 rounded-full border border-primary/25 bg-background/75 shadow-2xl backdrop-blur-xl"
          onClick={muteNoise}
          title="Mute ambient sound"
          aria-label="Mute ambient sound"
        >
          <Volume2 className="h-4 w-4 text-primary" />
        </Button>
      ) : (
        <Button
          type="button"
          variant="secondary"
          className="h-11 w-11 rounded-full border border-primary/25 bg-background/75 px-0 text-xs uppercase tracking-[0.18em] shadow-2xl backdrop-blur-xl lg:w-auto lg:px-4"
          onClick={enableNoise}
          title="Enable ambient sound"
          aria-label="Enable ambient sound"
        >
          <VolumeX className="h-4 w-4 text-primary lg:mr-2" />
          <span className="hidden lg:inline">Ambient</span>
        </Button>
      )}
    </div>
  );
}
