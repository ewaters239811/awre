import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import ts from "typescript";

const testDirectory = path.dirname(fileURLToPath(import.meta.url));
const requireNative = createRequire(import.meta.url);

// Run the real TypeScript modules with Node's test runner, without a test framework.
const modules = new Map();
function load(relativePath) {
  const filename = path.resolve(testDirectory, "..", relativePath);
  if (modules.has(filename)) return modules.get(filename).exports;
  const source = ts.transpileModule(fs.readFileSync(filename, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  const loaded = { exports: {} };
  modules.set(filename, loaded);
  const resolve = (id) => id.startsWith("@/") ? load(`${id.slice(2)}.ts`) : requireNative(id);
  new Function("require", "module", "exports", source)(resolve, loaded, loaded.exports);
  return loaded.exports;
}

const { getSafeRedirectPath, isPasswordRecoveryHash } = load("lib/auth-redirect.ts");
const { toDateKey, toCheckInDateKey } = load("lib/date-key.ts");
const { buildResult, getStateLabel, saveCheckIn, getCheckIns } = load("lib/alignment.ts");

test("auth redirects stay on this site even after URL normalization", () => {
  const origin = "https://www.clearpth.io";
  for (const input of [null, "https://example.com", "//example.com", "/\\example.com", "/\t/example.com", "/\n/example.com"]) {
    assert.equal(new URL(getSafeRedirectPath(input), origin).origin, origin);
  }
  assert.equal(getSafeRedirectPath("/reset-password?from=email"), "/reset-password?from=email");
});

test("only password recovery links trigger the reset screen", () => {
  assert.equal(isPasswordRecoveryHash("#type=recovery&access_token=test"), true);
  assert.equal(isPasswordRecoveryHash("#type=signup&access_token=test&refresh_token=test"), false);
  assert.equal(isPasswordRecoveryHash("#access_token=test&refresh_token=test"), false);
  assert.equal(isPasswordRecoveryHash(""), false);
});

test("check-in day rolls over at 4am, including month and year boundaries", () => {
  for (const [date, expected] of [
    [new Date(2026, 9, 18, 3, 59), "2026-10-17"],
    [new Date(2026, 9, 18, 4), "2026-10-18"],
    [new Date(2026, 0, 1, 1), "2025-12-31"],
    [new Date(2026, 2, 1, 1), "2026-02-28"],
  ]) assert.equal(toCheckInDateKey(date), expected);
  assert.equal(toDateKey(new Date(2026, 9, 18, 1)), "2026-10-18");
});

test("scores, labels, strongest and weakest pillars are calculated correctly", () => {
  const result = buildResult({ thinkingScore: 9, willingScore: 6, feelingScore: 3, dominantThought: "", avoidedAction: "", currentFeeling: "", highestBeingChoice: "" });
  assert.equal(result.beingScore, 6);
  assert.equal(result.strongestPillar, "Thinking");
  assert.equal(result.weakestPillar, "Feeling");
  for (const [score, label] of [[3.9, "Fragmented State"], [4, "Unstable State"], [6, "Awakening State"], [7.5, "Aligned State"], [9, "Magnetic State"], [10, "Magnetic State"]]) {
    assert.equal(getStateLabel(score), label);
  }
});

test("storage replaces a same-day check-in, preserves prior days and tolerates invalid JSON", () => {
  const data = new Map();
  global.window = { dispatchEvent() {} };
  global.localStorage = { getItem: (key) => data.get(key) ?? null, setItem: (key, value) => data.set(key, value) };
  try {
    const base = buildResult({ thinkingScore: 5, willingScore: 5, feelingScore: 5, dominantThought: "", avoidedAction: "", currentFeeling: "", highestBeingChoice: "" });
    saveCheckIn({ ...base, id: "yesterday", createdAt: "2026-10-17T16:00:00Z" });
    saveCheckIn({ ...base, id: "today", createdAt: "2026-10-18T16:00:00Z" });
    saveCheckIn({ ...base, id: "replacement", createdAt: "2026-10-18T17:00:00Z" });
    assert.deepEqual(getCheckIns().map((item) => item.id), ["replacement", "yesterday"]);
    data.set("aura.checkIns.v1", "invalid-json");
    assert.deepEqual(getCheckIns(), []);
  } finally {
    delete global.window;
    delete global.localStorage;
  }
});
