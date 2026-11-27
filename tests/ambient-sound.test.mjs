import assert from "node:assert/strict";
import { test } from "node:test";
import React from "react";
import { createLoader } from "./load-module.mjs";

test("the 432 Hz tone starts by default, resumes on interaction, and respects mute", async () => {
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
    oscillator = {
      frequency: { value: 0 },
      connect() {},
      start() {},
      stop() { this.onended?.(); },
    };
    gain = {
      connect() {},
      gain: {
        setValueAtTime() {},
        linearRampToValueAtTime: (level, time) => { this.fadeIn = [level, time]; },
        cancelScheduledValues() {},
        setTargetAtTime() {},
      },
    };
    constructor() {
      contexts.push(this);
    }
    createOscillator() {
      return this.oscillator;
    }
    createGain() {
      return this.gain;
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
  const toneRef = { current: null };
  let effect;
  let playback = "ready";
  let cleanup;
  try {
    const load = createLoader({
      react: {
        ...React,
        useCallback: (callback) => callback,
        useEffect: (callback) => { effect = callback; },
        useRef: () => toneRef,
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
    assert.equal(first.oscillator.type, "sine");
    assert.equal(first.oscillator.frequency.value, 432);
    assert.deepEqual(first.fadeIn, [0.025, 2]);
    assert.equal(first.resumeCalls, 0);
    assert.equal(button().title, "Play 432 Hz ambient sound");

    browserWindow.dispatchEvent(new Event("click"));
    assert.equal(first.resumeCalls, 1);
    assert.equal(button().title, "Mute 432 Hz ambient sound");
    browserDocument.hidden = true;
    browserDocument.dispatchEvent(new Event("visibilitychange"));
    assert.equal(first.closeCalls, 0);

    first.state = "suspended";
    browserDocument.hidden = false;
    browserDocument.dispatchEvent(new Event("visibilitychange"));
    assert.equal(first.resumeCalls, 2);

    setAmbientSoundEnabled(false);
    assert.equal(first.closeCalls, 1);
    assert.equal(storage.getItem("clearpth.ambientNoise.enabled"), "false");
    browserWindow.dispatchEvent(new Event("keydown"));
    assert.equal(contexts.length, 1);

    button().onClick();
    assert.equal(contexts.length, 2);
    assert.equal(contexts[1].resumeCalls, 1);
    assert.equal(storage.getItem("clearpth.ambientNoise.enabled"), "true");
  } finally {
    cleanup?.();
    delete globalThis.window;
    delete globalThis.document;
  }
  assert.equal(contexts.at(-1).closeCalls, 1);
});
