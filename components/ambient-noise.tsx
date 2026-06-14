"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Volume2, VolumeX } from "lucide-react";
import { Button } from "@/components/ui/button";

const AUDIO_CHOICE_KEY = "awre.ambientNoise.enabled";

type AudioState = "starting" | "blocked" | "playing" | "muted";

export function AmbientNoise() {
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

  const startNoise = useCallback(async () => {
    if (audioContext.current) {
      setAudioState("playing");
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
    masterGain.gain.value = 0.035;
    masterGain.connect(context.destination);

    const padGain = context.createGain();
    padGain.gain.value = 0.42;
    padGain.connect(masterGain);

    const shimmerGain = context.createGain();
    shimmerGain.gain.value = 0.12;
    shimmerGain.connect(masterGain);

    const airGain = context.createGain();
    airGain.gain.value = 0.09;
    airGain.connect(masterGain);

    const lowPass = context.createBiquadFilter();
    lowPass.type = "lowpass";
    lowPass.frequency.value = 900;
    lowPass.Q.value = 0.3;

    const highPass = context.createBiquadFilter();
    highPass.type = "highpass";
    highPass.frequency.value = 90;

    const bufferSize = context.sampleRate * 4;
    const buffer = context.createBuffer(1, bufferSize, context.sampleRate);
    const output = buffer.getChannelData(0);

    for (let index = 0; index < bufferSize; index += 1) {
      output[index] = (Math.random() * 2 - 1) * 0.16;
    }

    const airSource = context.createBufferSource();
    airSource.buffer = buffer;
    airSource.loop = true;
    airSource.connect(highPass);
    highPass.connect(lowPass);
    lowPass.connect(airGain);
    airSource.start();

    const frequencies = [110, 164.81, 220];
    frequencies.forEach((frequency, index) => {
      const oscillator = context.createOscillator();
      const toneGain = context.createGain();
      const lfo = context.createOscillator();
      const lfoGain = context.createGain();

      oscillator.type = "sine";
      oscillator.frequency.value = frequency;
      toneGain.gain.value = index === 0 ? 0.24 : 0.14;
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

    [329.63, 440].forEach((frequency, index) => {
      const oscillator = context.createOscillator();
      const toneGain = context.createGain();

      oscillator.type = "sine";
      oscillator.frequency.value = frequency;
      toneGain.gain.setValueAtTime(0.0001, context.currentTime);
      toneGain.gain.linearRampToValueAtTime(
        index === 0 ? 0.055 : 0.035,
        context.currentTime + 4,
      );
      oscillator.connect(toneGain);
      toneGain.connect(shimmerGain);
      oscillator.start();

      stopHandles.current.push(() => oscillator.stop());
      nodes.current.push(oscillator, toneGain);
    });

    audioContext.current = context;
    stopHandles.current.push(() => airSource.stop());
    nodes.current.push(masterGain, padGain, shimmerGain, airGain, lowPass, highPass, airSource);

    try {
      await context.resume();
      setAudioState(context.state === "running" ? "playing" : "blocked");
    } catch {
      setAudioState("blocked");
    }
  }, []);

  const enableNoise = useCallback(() => {
    localStorage.setItem(AUDIO_CHOICE_KEY, "true");
    queueMicrotask(() => {
      void startNoise();
    });
  }, [startNoise]);

  const muteNoise = useCallback(() => {
    localStorage.setItem(AUDIO_CHOICE_KEY, "false");
    stopNoise();
    setAudioState("muted");
  }, [stopNoise]);

  useEffect(() => {
    const savedChoice = localStorage.getItem(AUDIO_CHOICE_KEY);

    if (savedChoice === "false") {
      queueMicrotask(() => setAudioState("muted"));
      return undefined;
    }

    queueMicrotask(() => {
      void startNoise();
    });

    const unlockAudio = () => {
      if (localStorage.getItem(AUDIO_CHOICE_KEY) !== "false") {
        void startNoise();
      }
    };

    window.addEventListener("pointerdown", unlockAudio, { once: true });
    window.addEventListener("keydown", unlockAudio, { once: true });

    return () => {
      window.removeEventListener("pointerdown", unlockAudio);
      window.removeEventListener("keydown", unlockAudio);
      stopNoise();
    };
  }, [startNoise, stopNoise]);

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {audioState === "playing" ? (
        <Button
          type="button"
          variant="secondary"
          size="icon"
          className="h-11 w-11 rounded-full border border-primary/25 bg-background/75 shadow-2xl backdrop-blur-xl"
          onClick={muteNoise}
          title="Mute meditation music"
          aria-label="Mute meditation music"
        >
          <Volume2 className="h-4 w-4 text-primary" />
        </Button>
      ) : (
        <Button
          type="button"
          variant="secondary"
          className="h-11 rounded-full border border-primary/25 bg-background/75 px-4 text-xs uppercase tracking-[0.18em] shadow-2xl backdrop-blur-xl"
          onClick={enableNoise}
          title="Enable meditation music"
          aria-label="Enable meditation music"
        >
          <VolumeX className="mr-2 h-4 w-4 text-primary" />
          Sound
        </Button>
      )}
    </div>
  );
}
