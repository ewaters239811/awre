import { test } from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createLoader } from "./load-module.mjs";

const load = createLoader();
const { buildCheckInReading } = load("lib/check-in-reading.ts");
const { createEmptyOnboardingProfile } = load("lib/onboarding-storage.ts");
const { migrateManifestations } = load("lib/manifestations.ts");
const { buildResult } = load("lib/alignment.ts");
const profile = migrateManifestations({
  ...createEmptyOnboardingProfile(),
  primaryGoal: "Build fulfilling work",
});
const goalId = profile.manifestations.primaryGoalId;
const result = {
  ...buildResult({
    manifestationId: goalId,
    desiredReality: profile.primaryGoal,
    thinkingScore: 8,
    willingScore: 6,
    feelingScore: 7,
    dominantThought: "",
    avoidedAction: "",
    currentFeeling: "",
    highestBeingChoice: "",
    checkInJournal: "I shared my work despite feeling nervous.",
    journalEntryId: "linked",
  }),
  createdAt: "2026-11-22T12:00:00Z",
};
const journal = {
  id: "linked",
  manifestationId: goalId,
  date: "2026-11-22",
  content: result.checkInJournal,
  createdAt: result.createdAt,
  updatedAt: result.createdAt,
};

test("both result views share a request containing ratings, submitted writing, and only the matching goal's journals", async () => {
  const reading = buildCheckInReading(result, profile, [
    journal,
    {
      ...journal,
      id: "private-other",
      manifestationId: "other-goal",
      content: "OTHER GOAL",
    },
  ]);
  assert.equal(reading.request.result.checkInJournal, result.checkInJournal);
  assert.equal(reading.request.recentJournalEntries.length, 1);
  assert.ok(!JSON.stringify(reading).includes("OTHER GOAL"));
  let modelInput;
  const route = createLoader({
    "@/lib/server/openai": {
      createJsonWithOpenAI: async (input) => {
        modelInput = input.user;
        return { enabled: true, data: input.fallback };
      },
    },
  })("app/api/personalize/route.ts");
  await route.POST(
    new Request("http://localhost/api/personalize", {
      method: "POST",
      body: JSON.stringify(reading.request),
    }),
  );
  assert.equal(modelInput.checkInJournal, result.checkInJournal);
  assert.equal(modelInput.journalForCheckIn.content, journal.content);
  assert.equal(modelInput.thinkingScore, 8);
  assert.equal(modelInput.actingScore, 6);
  assert.equal(modelInput.feelingScore, 7);
  assert.equal(modelInput.recentJournalEntries[0].content, journal.content);
});

test("journal-aware reading stays stable on reload and changes when a later reflection is added", () => {
  const first = buildCheckInReading(result, profile, [journal]);
  assert.equal(
    first.signature,
    buildCheckInReading(
      { ...result, readAt: "now", aiAlignment: { summary: "Saved" } },
      profile,
      [{ ...journal, updatedAt: "later" }],
    ).signature,
  );
  const updated = {
    ...journal,
    content: `${journal.content}\n\nLater I spoke with a potential client.`,
  };
  const later = buildCheckInReading(result, profile, [updated]);
  assert.notEqual(first.signature, later.signature);
  assert.equal(later.request.result.checkInJournal, result.checkInJournal);
  assert.match(later.request.journalForCheckIn.content, /potential client/);
  assert.match(
    later.request.recentJournalEntries[0].content,
    /potential client/,
  );
});

test("the linked journal remains in the request even when eight newer entries exist", () => {
  const newer = Array.from({ length: 10 }, (_, index) => ({
    ...journal,
    id: `new-${index}`,
    date: `2026-12-${String(index + 1).padStart(2, "0")}`,
    content: `New reflection ${index}`,
  }));
  const first = buildCheckInReading(result, profile, [...newer, journal]);
  const shuffled = buildCheckInReading(result, profile, [
    journal,
    ...newer.reverse(),
  ]);
  assert.equal(first.request.recentJournalEntries.length, 8);
  assert.equal(first.request.recentJournalEntries[0].content, journal.content);
  assert.equal(first.signature, shuffled.signature);
});

test("legacy check-ins find their journal by goal and calendar date, including after midnight", () => {
  const old = {
    ...result,
    createdAt: "2026-11-23T01:00:00",
    checkInJournal: undefined,
    journalEntryId: undefined,
  };
  const overnight = {
    ...journal,
    id: "overnight",
    date: "2026-11-23",
    content: "Written just after midnight.",
  };
  const reading = buildCheckInReading(old, profile, [journal, overnight]);
  assert.equal(reading.request.result.checkInJournal, overnight.content);
  assert.equal(reading.request.result.journalEntryId, overnight.id);
  assert.equal(old.checkInJournal, undefined);
  assert.equal(
    buildCheckInReading(result, profile, []).request.result.checkInJournal,
    result.checkInJournal,
  );
});

test("Daily Path counts Check In, Read, and Tune In without a separate journal task", () => {
  const { DailyFlow } = load("components/daily-flow.tsx");
  const markup = renderToStaticMarkup(
    React.createElement(DailyFlow, {
      checkedIn: true,
      readToday: true,
      meditated: false,
    }),
  );
  assert.ok(markup.includes("2 / 3"));
  assert.ok(markup.includes('href="/check-in"'));
  assert.ok(markup.includes('href="/review"'));
  assert.ok(markup.includes('href="/tune-in"'));
  assert.ok(!markup.includes("Journal"));
  assert.ok(!markup.includes("/ritual"));
});

test("the old journal URL redirects into Check In and navigation has no separate Journal link", () => {
  let destination;
  const route = createLoader({
    "next/navigation": {
      redirect: (path) => {
        destination = path;
      },
    },
  })("app/ritual/page.tsx");
  route.default();
  assert.equal(destination, "/check-in#journal");
  const { Navigation } = createLoader({
    "next/navigation": {
      usePathname: () => "/check-in",
      useRouter: () => ({ push() {}, back() {} }),
    },
  })("components/navigation.tsx");
  const markup = renderToStaticMarkup(React.createElement(Navigation));
  assert.ok(markup.includes('href="/check-in"'));
  assert.ok(!markup.includes("/ritual"));
  assert.ok(!markup.includes(">Journal<"));
});
