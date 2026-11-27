import assert from "node:assert/strict";
import { test } from "node:test";
import React from "react";
import { createLoader } from "./load-module.mjs";

test("the ocean and bowl loop starts by default, resumes on interaction, and respects mute", async () => {
  const contexts = [];
  const preferences = new Map();
  const storage = {
    getItem: (key) => preferences.get(key) ?? null,
    setItem: (key, value) => preferences.set(key, value),
  };
  const mockAudioContext = class {
    state = "suspended";
    currentTime = 0;
    destination = {};
    resumeCalls = 0;
    closeCalls = 0;
    source = {
      connect(target) { this.target = target; },
      start(time) { this.startedAt = time; },
      stop(time) {
        this.stoppedAt = time;
        this.onended?.();
      },
    };
    output = {
      connect(target) { this.target = target; },
      gain: {
        value: 1,
        automation: [],
        setTargetAtTime(...event) { this.automation.push(event); },
      },
    };
    constructor() {
      contexts.push(this);
    }
    createBuffer(channels, frames, sampleRate) {
      assert.equal(channels, 1);
      const samples = new Float32Array(frames);
      return { sampleRate, getChannelData: () => samples };
    }
    createBufferSource() {
      return this.source;
    }
    createGain() {
      return this.output;
    }
    async resume() {
      this.resumeCalls += 1;
      this.state = "running";
      this.onstatechange?.();
    }
    async close() {
      this.closeCalls += 1;
      this.state = "closed";
    }
  };

  const browserWindow = Object.assign(new EventTarget(), {
    AudioContext: mockAudioContext,
    localStorage: storage,
  });
  const browserDocument = Object.assign(new EventTarget(), { hidden: false });
  globalThis.window = browserWindow;
  globalThis.document = browserDocument;
  const soundRef = { current: null };
  let effect;
  let playback = "ready";
  let cleanup;
  try {
    const load = createLoader({
      react: {
        ...React,
        useCallback: (callback) => callback,
        useEffect: (callback) => { effect = callback; },
        useRef: () => soundRef,
        useState: () => [playback, (next) => { playback = next; }],
      },
    });
    const { AmbientNoise } = load("components/ambient-noise.tsx");
    const { getAmbientSoundEnabled, setAmbientSoundEnabled } = load("lib/ambient-sound.ts");
    const button = () => AmbientNoise().props.children.props;

    assert.equal(getAmbientSoundEnabled(), true);
    button();
    cleanup = effect();
    await Promise.resolve();
    const first = contexts[0];
    const { source, output } = first;
    assert.equal(source.loop, true);
    assert.equal(source.startedAt, 0);
    assert.equal(source.target, output);
    assert.equal(output.target, first.destination);
    assert.deepEqual(output.gain.automation, [[0.1, 0, 0.45]]);

    const { sampleRate } = source.buffer;
    const samples = source.buffer.getChannelData(0);
    assert.equal(samples.length / sampleRate, 24);
    assert.ok(samples[0] === 0 && samples.at(-1) === 0);
    assert.ok(samples.every((sample) => Math.abs(sample) <= 1));

    const measure = (startSeconds) => {
      const start = Math.round(startSeconds * sampleRate);
      const length = Math.round(0.5 * sampleRate);
      let power = 0;
      let real = 0;
      let imaginary = 0;
      for (let frame = 0; frame < length; frame += 1) {
        const sample = samples[start + frame];
        const phase = frame * 2 * Math.PI * 432 / sampleRate;
        power += sample ** 2;
        real += sample * Math.cos(phase);
        imaginary += sample * Math.sin(phase);
      }
      return { rms: Math.sqrt(power / length), bowl: 2 * Math.hypot(real, imaginary) / length };
    };
    const surf = measure(9);
    const strike = measure(1.45);
    assert.ok(surf.rms > 0.02 && surf.bowl < 0.02);
    assert.ok(strike.bowl > 0.1 && strike.bowl > 5 * surf.bowl);

    assert.equal(first.resumeCalls, 0);
    assert.equal(button().title, "Play meditation sound");

    browserWindow.dispatchEvent(new Event("click"));
    assert.equal(first.resumeCalls, 1);
    assert.equal(button().title, "Mute meditation sound");
    browserDocument.hidden = true;
    browserDocument.dispatchEvent(new Event("visibilitychange"));
    assert.equal(first.closeCalls, 0);

    first.state = "suspended";
    browserDocument.hidden = false;
    browserDocument.dispatchEvent(new Event("visibilitychange"));
    assert.equal(first.resumeCalls, 2);

    first.currentTime = 5;
    setAmbientSoundEnabled(false);
    assert.deepEqual(output.gain.automation.at(-1), [0, 5, 0.025]);
    assert.equal(source.stoppedAt, 5.15);
    assert.equal(first.closeCalls, 1);
    assert.equal(storage.getItem("clearpth.ambientNoise.enabled"), "false");
    browserWindow.dispatchEvent(new Event("keydown"));
    assert.equal(contexts.length, 1);

    button().onClick();
    assert.equal(contexts.length, 2);
    assert.equal(contexts[1].resumeCalls, 1);
    assert.equal(contexts[1].source.buffer, source.buffer);
    assert.equal(storage.getItem("clearpth.ambientNoise.enabled"), "true");
  } finally {
    cleanup?.();
    delete globalThis.window;
    delete globalThis.document;
  }
  assert.equal(contexts.at(-1).closeCalls, 1);
});
