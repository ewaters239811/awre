import { test } from "node:test";
import assert from "node:assert/strict";
import { browserStorage, createLoader } from "./load-module.mjs";

function accountFixture() {
  const rows = new Map();
  let failWrites = false;
  const client = {
    auth: {
      getUser: async () => ({ data: { user: { id: "test-user" } } }),
      signOut: async () => ({ error: null }),
    },
    from(table) {
      let deleting = false;
      const filters = [];
      const query = {
        delete() { deleting = true; return query; },
        eq(field, value) { filters.push((row) => row[field] === value); return query; },
        in(field, values) { filters.push((row) => values.includes(row[field])); return query; },
        select() {
          return query;
        },
        order() {
          return query;
        },
        limit() {
          return query;
        },
        maybeSingle: async () => ({
          data: rows.get(table)?.[0] ?? null,
          error: null,
        }),
        then(resolve, reject) {
          if (deleting) rows.set(table, (rows.get(table) ?? []).filter((row) => !filters.every((filter) => filter(row))));
          return Promise.resolve({
            data: rows.get(table) ?? [],
            error: null,
          }).then(resolve, reject);
        },
        async upsert(row) {
          if (failWrites) return { error: new Error("Connection lost") };
          const old = rows.get(table) ?? [];
          rows.set(table, [
            ...old.filter((entry) =>
              row.id ? entry.id !== row.id : entry.user_id !== row.user_id,
            ),
            JSON.parse(JSON.stringify(row)),
          ]);
          return { error: null };
        },
      };
      return query;
    },
  };
  return {
    rows,
    client,
    failWrites: () => {
      failWrites = true;
    },
  };
}

test("account migration, goal saving, sign-out and reload preserve remote goals and legacy records", async () => {
  const browser = browserStorage();
  const fixture = accountFixture();
  const load = createLoader({
    "@/lib/supabase/client": {
      isSupabaseConfigured: () => true,
      createSupabaseBrowserClient: () => fixture.client,
    },
  });
  const account = load("lib/account-data.ts");
  const goals = load("lib/manifestations.ts");
  const onboarding = load("lib/onboarding-storage.ts");
  const alignment = load("lib/alignment.ts");
  const journal = load("lib/journal-storage.ts");
  try {
    const profile = {
      ...onboarding.createEmptyOnboardingProfile(),
      primaryGoal: "My original desire",
    };
    fixture.rows.set("onboarding_profiles", [
      { user_id: "test-user", data: profile },
    ]);
    fixture.rows.set("check_ins", [
      {
        id: "old",
        user_id: "test-user",
        data: {
          ...alignment.buildResult({
            thinkingScore: 8,
            willingScore: 7,
            feelingScore: 6,
            dominantThought: "",
            avoidedAction: "",
            currentFeeling: "",
            highestBeingChoice: "",
          }),
          id: "old",
        },
      },
    ]);
    fixture.rows.set("journal_entries", [
      {
        data: {
          id: "old-entry",
          date: "2026-10-19",
          content: "Original journal",
          createdAt: profile.createdAt,
          updatedAt: profile.updatedAt,
        },
      },
    ]);
    await account.syncLocalDataToAccount();
    const first = onboarding.getOnboardingProfile();
    assert.ok(fixture.rows.get("onboarding_profiles")[0].data.manifestations);
    const goal = goals.addDevelopment(
      goals.createManifestation({
        outcome: "A fulfilling career",
        category: "Career",
        identity: "Capable and consistent",
        targetDate: "",
      }),
      "action",
      "Completed a portfolio",
    );
    const next = goals.withManifestations(first, {
      ...first.manifestations,
      goals: [...first.manifestations.goals, goal],
      primaryGoalId: goal.id,
      innerFoundation: "I am enough.",
    });
    await account.saveOnboardingProfileToAccount(next);
    onboarding.saveOnboardingProfile(next);
    const checkIn = alignment.buildResult({
      thinkingScore: 7,
      willingScore: 8,
      feelingScore: 9,
      dominantThought: "",
      avoidedAction: "",
      currentFeeling: "",
      highestBeingChoice: "",
      manifestationId: goal.id,
      desiredReality: goal.outcome,
    });
    await account.saveCheckInToAccount(checkIn);
    await account.saveJournalEntryToAccount({
      ...journal.createEmptyJournalEntry("2026-10-19"),
      content: "Career entry",
    });
    await account.signOutOfAccount();
    assert.equal(onboarding.getOnboardingProfile(), null);
    assert.deepEqual(alignment.getAllCheckIns(), []);
    await account.syncLocalDataToAccount();
    const restored = onboarding.getOnboardingProfile();
    assert.equal(restored.manifestations.goals.length, 2);
    assert.equal(restored.manifestations.innerFoundation, "I am enough.");
    assert.equal(
      restored.manifestations.goals[1].developments[0].text,
      "Completed a portfolio",
    );
    assert.equal(alignment.getCheckIns().length, 1);
    assert.equal(journal.getJournalEntries()[0].content, "Career entry");
    assert.equal(
      alignment.getCheckIns(first.manifestations.legacyGoalId)[0].id,
      "old",
    );
    assert.equal(
      journal.getJournalEntries(first.manifestations.legacyGoalId)[0].content,
      "Original journal",
    );
    await account.clearRemoteCheckIns(first.manifestations.legacyGoalId);
    assert.equal(fixture.rows.get("check_ins").length, 1);
    assert.equal(fixture.rows.get("check_ins")[0].id, checkIn.id);
    fixture.failWrites();
    await assert.rejects(
      account.saveOnboardingProfileToAccount({
        ...restored,
        primaryGoal: "Unsaved edit",
      }),
    );
    assert.equal(onboarding.getOnboardingProfile().primaryGoal, goal.outcome);
  } finally {
    browser.cleanup();
  }
});
