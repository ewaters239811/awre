import { test } from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createLoader, browserStorage } from "./load-module.mjs";

const goal = {
  id: "goal-one",
  outcome: "Build a fulfilling career",
  status: "active",
  category: "Career",
  identity: "",
  developments: [],
};
const scores = { thinkingScore: 8, willingScore: 4, feelingScore: 6 };
const content =
  "I feel hopeful. I took time to reach out to someone whose work I admire.";
const date = "2026-11-22";
const input = {
  scores,
  content,
  goal,
  journalDate: date,
  existingJournal: null,
};

function setup() {
  const storage = browserStorage();
  const remoteJournals = new Map();
  const remoteCheckIns = new Map();
  let failJournal = false;
  let failCheckIn = false;
  const load = createLoader({
    "@/lib/account-data": {
      saveJournalEntryToAccount: async (entry) => {
        if (failJournal) throw new Error("offline");
        remoteJournals.set(entry.id, structuredClone(entry));
      },
      saveCheckInToAccount: async (entry) => {
        if (failCheckIn) throw new Error("offline");
        remoteCheckIns.set(entry.id, structuredClone(entry));
      },
    },
  });
  return {
    storage,
    load,
    remoteJournals,
    remoteCheckIns,
    failJournal: (value) => {
      failJournal = value;
    },
    failCheckIn: (value) => {
      failCheckIn = value;
    },
    ...load("lib/check-in-session.ts"),
  };
}

test("a check-in captures the ratings, goal, and journal together without relabeling writing as a thought", () => {
  const env = setup();
  try {
    const { result, journal } = env.createCheckInSession({
      ...input,
      innerFoundation: "I trust my own worth",
    });
    assert.equal(result.beingScore, 6);
    assert.equal(result.checkInJournal, content);
    assert.equal(result.journalEntryId, journal.id);
    assert.equal(result.manifestationId, goal.id);
    assert.equal(journal.manifestationId, goal.id);
    assert.equal(journal.date, date);
    assert.equal(journal.content, content);
    assert.equal(result.dominantThought, "");
    assert.equal(result.innerFoundation, "I trust my own worth");
  } finally {
    env.storage.cleanup();
  }
});

test("existing writing and action metadata are preserved; a different goal/day cannot be overwritten", () => {
  const env = setup();
  try {
    const existing = {
      id: "existing",
      manifestationId: goal.id,
      date,
      content: "Earlier reflection",
      alignedAction: "Send a message",
      alignedActionCompletedAt: "done",
      createdAt: "original",
    };
    const session = env.createCheckInSession({
      ...input,
      existingJournal: existing,
    });
    assert.equal(session.journal.id, "existing");
    assert.equal(session.journal.content, `Earlier reflection\n\n${content}`);
    assert.equal(session.journal.alignedActionCompletedAt, "done");
    assert.equal(session.journal.createdAt, "original");
    assert.equal(session.result.checkInJournal, content);
    assert.equal(existing.content, "Earlier reflection");
    assert.throws(
      () =>
        env.createCheckInSession({
          ...input,
          existingJournal: { ...existing, manifestationId: "other" },
        }),
      /different/,
    );
    assert.throws(
      () =>
        env.createCheckInSession({
          ...input,
          existingJournal: { ...existing, date: "2026-11-21" },
        }),
      /different/,
    );
  } finally {
    env.storage.cleanup();
  }
});

test("combined submission validates empty/long writing and invalid scores", () => {
  const env = setup();
  try {
    assert.throws(
      () => env.createCheckInSession({ ...input, content: "   " }),
      /Write a little/,
    );
    assert.throws(
      () => env.createCheckInSession({ ...input, content: "a".repeat(8001) }),
      /8,000/,
    );
    assert.throws(
      () =>
        env.createCheckInSession({
          ...input,
          scores: { ...scores, feelingScore: 11 },
        }),
      /1 to 10/,
    );
  } finally {
    env.storage.cleanup();
  }
});

test("saving writes both records and marks today's journal complete without touching another goal", async () => {
  const env = setup();
  try {
    const journals = env.load("lib/journal-storage.ts");
    journals.saveJournalEntry({
      id: "other",
      manifestationId: "goal-two",
      date,
      content: "Other goal",
      createdAt: "now",
      updatedAt: "now",
    });
    const session = env.createCheckInSession(input);
    await env.saveCheckInSession(session);
    assert.equal(
      env.remoteCheckIns.get(session.result.id).checkInJournal,
      content,
    );
    assert.equal(env.remoteJournals.get(session.journal.id).content, content);
    assert.equal(
      journals.getJournalEntryForDate(date, goal.id).content,
      content,
    );
    assert.equal(
      journals.getJournalEntryForDate(date, "goal-two").content,
      "Other goal",
    );
    assert.equal(
      env.load("lib/alignment.ts").getCheckIns(goal.id)[0].journalEntryId,
      session.journal.id,
    );
  } finally {
    env.storage.cleanup();
  }
});

test("partial failure preserves writing and retry reuses the same records without duplicate content", async () => {
  const env = setup();
  try {
    const session = env.createCheckInSession(input);
    env.failJournal(true);
    await assert.rejects(env.saveCheckInSession(session));
    assert.equal(env.remoteCheckIns.size, 0);
    assert.equal(env.remoteJournals.size, 0);
    env.failJournal(false);
    env.failCheckIn(true);
    await assert.rejects(env.saveCheckInSession(session));
    assert.equal(env.remoteJournals.size, 1);
    assert.equal(
      env.load("lib/journal-storage.ts").getJournalEntryForDate(date, goal.id)
        .content,
      content,
    );
    assert.equal(env.load("lib/alignment.ts").getCheckIns(goal.id).length, 0);
    env.failCheckIn(false);
    await env.saveCheckInSession(session);
    await env.saveCheckInSession(session);
    assert.equal(env.remoteJournals.size, 1);
    assert.equal(env.remoteCheckIns.size, 1);
    assert.equal(env.remoteJournals.get(session.journal.id).content, content);
    assert.equal(env.load("lib/alignment.ts").getCheckIns(goal.id).length, 1);
  } finally {
    env.storage.cleanup();
  }
});

test("a later reflection updates the journal without another check-in or changing its original ratings and writing", async () => {
  const env = setup();
  try {
    const session = env.createCheckInSession(input);
    await env.saveCheckInSession(session);
    const { createJournalReflection } = env.load("lib/check-in-session.ts");
    const journal = createJournalReflection({
      content: "Later I took another small step.",
      goalId: goal.id,
      journalDate: date,
      existingJournal: session.journal,
    });
    await env.saveCheckInSession({ result: session.result, journal });
    const saved = env.load("lib/alignment.ts").getCheckIns(goal.id);
    assert.equal(saved.length, 1);
    assert.equal(saved[0].id, session.result.id);
    assert.equal(saved[0].createdAt, session.result.createdAt);
    assert.equal(saved[0].thinkingScore, scores.thinkingScore);
    assert.equal(saved[0].checkInJournal, content);
    assert.equal(
      env.remoteJournals.get(journal.id).content,
      `${content}\n\nLater I took another small step.`,
    );
  } finally {
    env.storage.cleanup();
  }
});

test("the reading service receives the submitted journal and all ratings even without a journal mirror", async () => {
  const env = setup();
  try {
    let received;
    const load = createLoader({
      "@/lib/server/openai": {
        createJsonWithOpenAI: async (options) => {
          received = options;
          return {
            enabled: true,
            data: {
              ...options.fallback,
              summary: "Your hope is finding expression in a concrete choice.",
            },
          };
        },
      },
    });
    const session = env.createCheckInSession(input);
    const response = await load("app/api/personalize/route.ts").POST(
      new Request("http://localhost/api/personalize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ result: session.result }),
      }),
    );
    assert.equal((await response.json()).enabled, true);
    assert.equal(received.user.checkInJournal, content);
    assert.equal(received.user.thinkingScore, 8);
    assert.equal(received.user.actingScore, 4);
    assert.equal(received.user.feelingScore, 6);
    assert.match(received.system, /scores together with the checkInJournal/);
    assert.match(received.system, /not evidence of avoidance/);
    const { buildAiReadingSignature } = load("lib/ai-reading-signature.ts");
    const context = {
      result: session.result,
      onboardingProfile: null,
      journalEntries: [],
    };
    assert.notEqual(
      buildAiReadingSignature(context),
      buildAiReadingSignature({
        ...context,
        result: { ...session.result, checkInJournal: "A different reflection" },
      }),
    );
    assert.equal(
      buildAiReadingSignature(context),
      buildAiReadingSignature({
        ...context,
        result: {
          ...session.result,
          aiAlignment: { summary: "Saved reading" },
          readAt: "now",
        },
      }),
    );
  } finally {
    env.storage.cleanup();
  }
});

test("check-in stays a simple form with three accessible ratings and one journal", () => {
  const load = createLoader({
    "next/navigation": { useRouter: () => ({ push() {} }) },
    "@/lib/account-data": { getCurrentAccount: async () => ({ id: "test" }) },
    "@/lib/check-in-session": { CHECK_IN_JOURNAL_LIMIT: 8000 },
    "@/components/saved-check-in-journal": {
      SavedCheckInJournal: () => null,
      CheckInJournalHistory: () =>
        React.createElement("p", null, "PAST_JOURNAL_SENTINEL"),
    },
    "@/lib/use-manifestations": {
      useManifestations: () => ({ primary: goal, state: {} }),
    },
    "@/lib/use-current-check-in-date-key": {
      useCurrentCheckInDateKey: () => date,
    },
  });
  const markup = renderToStaticMarkup(
    React.createElement(load("app/check-in/page.tsx").default),
  );
  assert.equal((markup.match(/role="slider"/g) ?? []).length, 3);
  assert.equal((markup.match(/<textarea/g) ?? []).length, 1);
  for (const label of ["Thinking", "Feeling", "Acting"])
    assert.ok(markup.includes(`aria-label="${label}"`));
  assert.ok(markup.includes("See My Alignment"));
  assert.ok(!markup.includes("Gate 01"));
  assert.ok(!markup.includes("Add More Detail"));
  assert.ok(!markup.includes("PAST_JOURNAL_SENTINEL"));
  assert.ok(!markup.includes("Past journal entries"));
});
