import assert from "node:assert/strict";
import { test } from "node:test";
import { PostgrestClient } from "@supabase/postgrest-js";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createLoader } from "./load-module.mjs";

const load = createLoader();
const {
  buildWeeklyLetterContext,
  cleanWeeklyLetter,
  getWeeklyLetterEdition,
  writeWeeklyLetterFallback,
} = load("lib/weekly-letters.ts");
const { migrateManifestations, withManifestations } = load("lib/manifestations.ts");

const edition = { weekOf: "2026-11-22", start: "2026-11-15" };
const window = { start: edition.start, endExclusive: edition.weekOf };
const profile = {
  primaryGoal: "Share my writing with an audience",
  guidanceTone: "gentle",
  createdAt: "2026-10-01T00:00:00Z",
  updatedAt: "2026-10-01T00:00:00Z",
};

test("Home shows the full inbox count and refreshes it as letters arrive", async () => {
  let letterCount = 0;
  let serverCount = 0;
  let requests = 0;
  let refreshTimer;
  let effect;
  const client = new PostgrestClient("https://example.test/rest/v1", {
    fetch: async (input, options) => {
      const url = new URL(input);
      assert.equal(url.pathname, "/rest/v1/weekly_letters");
      assert.equal(url.searchParams.has("read_at"), false);
      assert.equal(options.method, "HEAD");
      assert.equal(new Headers(options.headers).get("prefer"), "count=exact");
      requests += 1;
      return new Response(null, { headers: { "Content-Range": `*/${serverCount}` } });
    },
  });
  const { WeeklyLetterLink } = createLoader({
    "next/link": { default: (props) => React.createElement("a", props) },
    react: {
      useEffect: (initialize) => { effect = initialize; },
      useState: () => [letterCount, (value) => { letterCount = value; }],
    },
    "@/lib/supabase/client": {
      isSupabaseConfigured: () => true,
      createSupabaseBrowserClient: () => client,
    },
  })("components/weekly-letter-link.tsx");
  const render = () => renderToStaticMarkup(WeeklyLetterLink());
  const browserWindow = Object.assign(new EventTarget(), {
    setInterval: (refresh) => { refreshTimer = refresh; },
    clearInterval: () => { refreshTimer = undefined; },
  });
  const browserDocument = Object.assign(new EventTarget(), { hidden: false });
  globalThis.window = browserWindow;
  globalThis.document = browserDocument;
  let cleanup;
  try {
    assert.doesNotMatch(render(), /in inbox/);
    cleanup = effect();
    await new Promise(setImmediate);
    assert.doesNotMatch(render(), /in inbox/);
    serverCount = 1;
    await refreshTimer();
    assert.match(render(), /Weekly letters, 1 in inbox.*>1<\/span>/);
    serverCount = 2;
    await refreshTimer();
    assert.match(render(), /Weekly letters, 2 in inbox.*>2<\/span>/);
    browserDocument.hidden = true;
    await refreshTimer();
    assert.equal(requests, 3);
  } finally {
    cleanup?.();
    delete globalThis.window;
    delete globalThis.document;
  }
});

test("delivery runs only on Sundays from noon UTC and reflects on the preceding seven days", () => {
  assert.equal(getWeeklyLetterEdition(new Date("2026-11-21T23:59:59Z")), null);
  assert.equal(getWeeklyLetterEdition(new Date("2026-11-22T11:59:59Z")), null);
  assert.deepEqual(getWeeklyLetterEdition(new Date("2026-11-22T12:00:00Z")), edition);
  assert.deepEqual(getWeeklyLetterEdition(new Date("2026-11-22T23:59:59Z")), edition);
  assert.equal(getWeeklyLetterEdition(new Date("2026-11-23T12:00:00Z")), null);
  assert.deepEqual(getWeeklyLetterEdition(new Date("2027-01-03T12:00:00Z")), {
    weekOf: "2027-01-03",
    start: "2026-12-27",
  });
});

test("evidence is scoped to the completed week and active goal, including older untagged records", () => {
  const migrated = migrateManifestations(profile);
  const legacy = migrated.manifestations.goals[0];
  const other = { ...legacy, id: "other", outcome: "Learn to swim" };
  const withGoals = withManifestations(migrated, {
    ...migrated.manifestations,
    goals: [
      { ...legacy, developments: [
        { kind: "action", text: "Share a draft", createdAt: "2026-11-10", completedAt: "2026-11-18" },
        { kind: "note", text: "Outside the week", createdAt: "2026-11-12" },
      ] },
      other,
    ],
  });
  const checkIn = {
    createdAt: "2026-11-22T03:00:00Z",
    checkInDate: "2026-11-21",
    checkInJournal: "I enjoyed sharing a draft.",
    journalEntryId: "journal",
    thinkingScore: 7,
    feelingScore: 6,
    willingScore: 5,
  };
  const journal = {
    id: "journal",
    date: "2026-11-21",
    content: "I enjoyed sharing a draft. I would like to do it again.",
  };
  const context = buildWeeklyLetterContext(window, withGoals, [
    checkIn,
    { ...checkIn, checkInDate: edition.weekOf },
    { ...checkIn, manifestationId: other.id },
    { ...checkIn, checkInDate: edition.start, checkInJournal: undefined, dominantThought: "I was unsure." },
  ], [journal, { ...journal, date: "2026-11-14" }, { ...journal, manifestationId: other.id }]);
  assert.equal(context.desiredReality, profile.primaryGoal);
  assert.deepEqual(context.period, { from: edition.start, through: "2026-11-21" });
  assert.equal(context.evidence, "week");
  assert.deepEqual(context.checkIns.map(({ reflection }) => reflection), ["", "I was unsure."]);
  assert.equal(context.journal.length, 1);
  assert.deepEqual(context.progress, [{
    date: "2026-11-18", kind: "action", completed: true, text: "Share a draft",
  }]);
  assert.match(writeWeeklyLetterFallback(context).paragraphs[1], /marked complete.*Share a draft/);

  const focusedOnOther = withManifestations(withGoals, {
    ...withGoals.manifestations,
    primaryGoalId: other.id,
  });
  assert.equal(buildWeeklyLetterContext(window, focusedOnOther, [checkIn], [journal]).journal.length, 0);
  assert.equal(buildWeeklyLetterContext(window, { ...profile, primaryGoal: "" }, [], []), null);
});

test("an empty week uses the latest older goal records and labels them as earlier", () => {
  const migrated = migrateManifestations(profile);
  const goal = migrated.manifestations.goals[0];
  const withProgress = withManifestations(migrated, {
    ...migrated.manifestations,
    goals: [{ ...goal, developments: [
      { kind: "note", text: "I sent a draft to my writing group.", createdAt: "2026-11-08" },
    ] }],
  });
  const journals = Array.from({ length: 9 }, (_, index) => ({
    date: `2026-11-${String(index + 1).padStart(2, "0")}`,
    content: `Reflection ${index + 1}`,
  }));
  journals.push(
    { date: "2026-11-15", manifestationId: "another-goal", content: "Other goal" },
    { date: edition.weekOf, content: "Next week" },
  );
  const context = buildWeeklyLetterContext(window, withProgress, [], journals);
  assert.equal(context.evidence, "history");
  assert.deepEqual(context.journal.map(({ reflection }) => reflection),
    [9, 8, 7, 6, 5, 4, 3].map((day) => `Reflection ${day}`));
  assert.match(writeWeeklyLetterFallback(context).paragraphs[0], /looking back.*earlier.*Reflection 9/);
  const progressOnly = buildWeeklyLetterContext(window, withProgress, [], []);
  assert.equal(progressOnly.evidence, "history");
  assert.match(writeWeeklyLetterFallback(progressOnly).paragraphs[0], /earlier.*writing group/);
});

test("sparse weeks have a first-person letter with an honest next step and malformed model output is rejected", () => {
  const context = buildWeeklyLetterContext(window, profile, [], []);
  assert.equal(context.evidence, "none");
  const fallback = writeWeeklyLetterFallback(context);
  assert.deepEqual(cleanWeeklyLetter(fallback), fallback);
  assert.match(fallback.paragraphs[0], /I have little written/);
  assert.ok(fallback.paragraphs[1].includes(profile.primaryGoal));
  assert.match(fallback.paragraphs[2], /I’ll make the next step smaller/);
  assert.equal(cleanWeeklyLetter({ ...fallback, paragraphs: ["You should go do more with your life."] }), null);
  assert.equal(cleanWeeklyLetter({ ...fallback, subject: 12 }), null);
});

test("delivery queries earlier account history only when the active goal has an empty week", async () => {
  const goalId = migrateManifestations(profile).manifestations.primaryGoalId;
  for (const hasWeek of [false, true]) {
    const historical = [];
    const modelInputs = [];
    const { dispatchWeeklyLetters } = createLoader({
      "@/lib/server/openai": {
        createJsonWithOpenAI: async ({ user }) => {
          modelInputs.push(user);
          return { data: null };
        },
      },
    })("lib/server/weekly-letters.ts");
    const client = new PostgrestClient("https://example.test/rest/v1", {
      fetch: async (input, options) => {
        const { pathname, searchParams } = new URL(input);
        const resource = pathname.split("/").at(-1);
        if (resource === "claim_weekly_letters")
          return Response.json([{ user_id: "account", claim_token: "lease" }]);
        if (resource === "onboarding_profiles") return Response.json([{ data: profile }]);
        if (resource === "weekly_letters") {
          const letter = JSON.parse(options.body);
          assert.match(letter.paragraphs[0], hasWeek ? /New note/ : /earlier.*Older note/);
          return Response.json([{ week_of: edition.weekOf }]);
        }
        const goalFilter = searchParams.get("data->>manifestationId");
        if (goalFilter) {
          assert.equal(searchParams.get("user_id"), "eq.account");
          assert.equal(searchParams.get("limit"), "7");
          historical.push([resource, goalFilter]);
        }
        if (resource !== "journal_entries") return Response.json([]);
        const note = goalFilter === "is.null"
          ? { date: "2026-10-15", content: "Older note" }
          : !goalFilter
            ? { date: edition.start, content: "New note", manifestationId: hasWeek ? goalId : "other-goal" }
            : null;
        return Response.json(note ? [{ data: note }] : []);
      },
    });
    assert.deepEqual(await dispatchWeeklyLetters(client, edition), { delivered: 1, failed: 0 });
    assert.equal(modelInputs[0].evidence, hasWeek ? "week" : "history");
    assert.deepEqual(historical, hasWeek ? [] : [
      ["check_ins", `eq.${goalId}`],
      ["journal_entries", `eq.${goalId}`],
      ["check_ins", "is.null"],
      ["journal_entries", "is.null"],
    ]);
  }
});

test("only the configured bearer token can run a Sunday delivery", async () => {
  const previous = process.env.WEEKLY_LETTERS_CRON_SECRET;
  process.env.WEEKLY_LETTERS_CRON_SECRET = "test-secret";
  const runs = [];
  let scheduledEdition = null;
  const { POST } = createLoader({
    "@/lib/weekly-letters": { getWeeklyLetterEdition: () => scheduledEdition },
    "@/lib/server/weekly-letters": {
      createWeeklyLetterClient: () => "worker",
      dispatchWeeklyLetters: (client, edition) => {
        runs.push([client, edition]);
        return { delivered: 2, failed: 0 };
      },
    },
  })("app/api/weekly-letters/deliver/route.ts");

  try {
    const request = (authorization) => new Request("https://example.test", {
      headers: authorization ? { authorization } : {},
    });
    assert.equal((await POST(request())).status, 401);
    assert.equal((await POST(request("Bearer fake-secret"))).status, 401);
    const offSchedule = await POST(request("Bearer test-secret"));
    assert.deepEqual(await offSchedule.json(), { delivered: 0, failed: 0 });
    assert.equal(runs.length, 0);
    scheduledEdition = edition;
    const result = await POST(request("Bearer test-secret"));
    assert.equal(result.status, 200);
    assert.deepEqual(await result.json(), { delivered: 2, failed: 0 });
    assert.deepEqual(runs, [["worker", edition]]);
  } finally {
    if (previous === undefined) delete process.env.WEEKLY_LETTERS_CRON_SECRET;
    else process.env.WEEKLY_LETTERS_CRON_SECRET = previous;
  }
});
