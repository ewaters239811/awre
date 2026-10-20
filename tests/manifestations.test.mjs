import { test } from "node:test";
import assert from "node:assert/strict";
import { createLoader, browserStorage } from "./load-module.mjs";

const load = createLoader();
const goals = load("lib/manifestations.ts");
const onboarding = load("lib/onboarding-storage.ts");
const alignment = load("lib/alignment.ts");
const journals = load("lib/journal-storage.ts");
const profile = {
  primaryGoal: "I trust myself to follow through.",
  desiredState: "Steady",
  currentChallenge: "Distraction",
  createdAt: "2025-01-01T12:00:00Z",
  updatedAt: "2025-01-01T12:00:00Z",
  practiceStyle: "Balanced",
  spiritualOpenness: "Open",
  commitmentLevel: "Daily",
  guidanceTone: "Direct",
};
const draft = {
  thinkingScore: 8,
  willingScore: 6,
  feelingScore: 7,
  dominantThought: "A clear thought",
  avoidedAction: "",
  currentFeeling: "Hope",
  highestBeingChoice: "Start",
};
const makeGoal = (outcome = "A loving relationship") =>
  goals.createManifestation({
    outcome,
    identity: "Present and open",
    category: "Relationships",
    targetDate: "",
  });

test("legacy migration preserves the exact statement, is deterministic and never infers foundation", () => {
  const migrated = goals.migrateManifestations(profile);
  assert.equal(migrated.manifestations.goals[0].outcome, profile.primaryGoal);
  assert.equal(migrated.manifestations.innerFoundation, "");
  assert.deepEqual(goals.migrateManifestations(migrated), migrated);
  assert.deepEqual(
    goals.migrateManifestations(JSON.parse(JSON.stringify(profile))),
    migrated,
  );
  assert.equal(
    migrated.manifestations.legacyGoalId,
    migrated.manifestations.primaryGoalId,
  );
});

test("measurable and qualitative outcomes work; invalid goals, dates, and scores are rejected", () => {
  assert.ok(makeGoal("I earn $250,000 doing fulfilling work.").id);
  assert.ok(makeGoal("I feel supported in a loving relationship.").id);
  assert.throws(() => makeGoal("  "));
  assert.throws(() =>
    goals.createManifestation({ ...makeGoal(), category: "Invalid" }),
  );
  assert.throws(() =>
    goals.createManifestation({ ...makeGoal(), targetDate: "2026-02-30" }),
  );
  for (const score of [0, 11, 5.5, NaN])
    assert.throws(() =>
      alignment.buildResult({ ...draft, willingScore: score }),
    );
});

test("switching goals changes daily focus, not foundation or goal progress", () => {
  const migrated = goals.migrateManifestations(profile);
  const second = makeGoal();
  const next = goals.withManifestations(migrated, {
    ...migrated.manifestations,
    goals: [...migrated.manifestations.goals, second],
    innerFoundation: "I am secure in my worth.",
  });
  const switched = goals.selectManifestation(next, second.id);
  assert.equal(switched.primaryGoal, second.outcome);
  assert.equal(
    switched.manifestations.innerFoundation,
    next.manifestations.innerFoundation,
  );
  assert.deepEqual(switched.manifestations.goals, next.manifestations.goals);
  assert.throws(() => goals.selectManifestation(next, "missing"));
});

test("archive, completion and reactivation retain developments and select a valid active focus", () => {
  const migrated = goals.migrateManifestations(profile);
  const first = goals.addDevelopment(
    migrated.manifestations.goals[0],
    "action",
    "Sent the proposal",
  );
  const second = makeGoal();
  const next = goals.withManifestations(migrated, {
    ...migrated.manifestations,
    goals: [first, second],
  });
  const completed = goals.setManifestationStatus(next, first.id, "completed");
  assert.ok(completed.manifestations.goals[0].completedAt);
  assert.equal(completed.manifestations.primaryGoalId, second.id);
  const archived = goals.setManifestationStatus(
    completed,
    second.id,
    "archived",
  );
  assert.equal(archived.manifestations.primaryGoalId, null);
  const active = goals.setManifestationStatus(archived, first.id, "active");
  assert.equal(active.manifestations.primaryGoalId, first.id);
  assert.ok(
    active.manifestations.goals[0].developments.some(
      (item) => item.id === first.developments[0].id,
    ),
  );
  assert.ok(
    active.manifestations.goals[0].developments.some(
      (item) => item.text === "Desired reality completed",
    ),
  );
  assert.ok(
    active.manifestations.goals[0].developments.some(
      (item) => item.text === "Desired reality reactivated",
    ),
  );
  assert.equal(active.manifestations.goals[0].completedAt, undefined);
});

test("milestones and notes remain distinct from completed actions", () => {
  const goal = makeGoal();
  const withMilestone = goals.addDevelopment(
    goal,
    "milestone",
    "First conversation",
  );
  assert.equal(withMilestone.developments[0].completedAt, undefined);
  assert.ok(
    goals.addDevelopment(goal, "action", "Made a call").developments[0]
      .completedAt,
  );
  assert.equal(
    goals.addDevelopment(goal, "note", "A new opportunity").developments[0]
      .kind,
    "note",
  );
  assert.throws(() => goals.addDevelopment(goal, "note", " "));
});

test("same-day check-ins and journals survive switching, reload, and legacy migration", () => {
  const browser = browserStorage();
  try {
    // Existing records predate the goal system and have no goal ID.
    const legacy = { ...alignment.buildResult(draft), id: "old-check-in" };
    alignment.saveCheckIn(legacy);
    journals.saveJournalEntry({
      id: "old-journal",
      date: "2026-10-19",
      content: "Keep all my words.",
      createdAt: profile.createdAt,
      updatedAt: profile.createdAt,
    });
    onboarding.saveOnboardingProfile(profile);
    const first = onboarding.getOnboardingProfile();
    const firstId = first.manifestations.primaryGoalId;
    const second = makeGoal();
    const both = goals.withManifestations(first, {
      ...first.manifestations,
      goals: [...first.manifestations.goals, second],
    });
    onboarding.saveOnboardingProfile(
      goals.selectManifestation(both, second.id),
    );
    assert.deepEqual(alignment.getCheckIns(), []);
    assert.deepEqual(journals.getJournalEntries(), []);
    alignment.saveCheckIn({
      ...alignment.buildResult(draft),
      id: "new-check-in",
      manifestationId: second.id,
    });
    journals.saveJournalEntry({
      ...journals.createEmptyJournalEntry("2026-10-19"),
      content: "A different reality.",
    });
    assert.equal(alignment.getAllCheckIns().length, 2);
    assert.equal(journals.getAllJournalEntries().length, 2);
    assert.equal(alignment.getCheckIns()[0].id, "new-check-in");
    assert.equal(
      journals.getJournalEntries()[0].content,
      "A different reality.",
    );
    const reloaded = createLoader();
    assert.equal(
      reloaded("lib/alignment.ts").getCheckIns()[0].manifestationId,
      second.id,
    );
    onboarding.saveOnboardingProfile(
      goals.selectManifestation(onboarding.getOnboardingProfile(), firstId),
    );
    assert.equal(alignment.getCheckIns()[0].id, "old-check-in");
    assert.equal(journals.getJournalEntries()[0].content, "Keep all my words.");
    assert.equal(
      alignment.getCheckInById("new-check-in").manifestationId,
      second.id,
    );
    alignment.updateCheckIn({ ...legacy, readAt: "2026-10-19T12:00:00Z" });
    assert.equal(alignment.getAllCheckIns().length, 2);
  } finally {
    browser.cleanup();
  }
});

test("editing through legacy setup preserves other goals and migration ownership", () => {
  const first = goals.migrateManifestations(profile);
  const second = makeGoal();
  const both = goals.withManifestations(first, {
    ...first.manifestations,
    goals: [...first.manifestations.goals, second],
  });
  const edited = goals.reconcileManifestations({
    ...both,
    primaryGoal: "A refined outcome",
  });
  assert.equal(edited.manifestations.goals[0].outcome, "A refined outcome");
  assert.equal(edited.manifestations.goals[1].outcome, second.outcome);
  assert.equal(
    edited.manifestations.legacyGoalId,
    first.manifestations.legacyGoalId,
  );
});

test("historical reading uses its saved goal even when another is primary", () => {
  const first = goals.migrateManifestations(profile);
  const second = makeGoal();
  const both = goals.withManifestations(first, {
    ...first.manifestations,
    goals: [...first.manifestations.goals, second],
    primaryGoalId: second.id,
  });
  const historical = goals.profileForCheckIn(both, {
    manifestationId: first.manifestations.legacyGoalId,
    desiredReality: "The original saved outcome",
    innerFoundation: "Original foundation",
  });
  assert.equal(historical.primaryGoal, "The original saved outcome");
  assert.equal(
    historical.manifestations.innerFoundation,
    "Original foundation",
  );
  assert.equal(historical.manifestations.goals.length, 1);
  assert.notEqual(historical.manifestations.goals[0].id, second.id);
});

test("explicit reclassification preserves both the existing foundation and legacy goal history", () => {
  const first = goals.migrateManifestations(profile);
  const next = goals.reclassifyLegacyFoundation(
    goals.withManifestations(first, {
      ...first.manifestations,
      innerFoundation: "I am whole.",
    }),
    first.manifestations.legacyGoalId,
  );
  assert.equal(
    next.manifestations.innerFoundation,
    `I am whole.\n\n${profile.primaryGoal}`,
  );
  assert.equal(next.manifestations.goals[0].status, "archived");
  assert.equal(next.manifestations.goals[0].outcome, profile.primaryGoal);
});

test("clearing one goal and delayed reading updates never erase another goal's data", () => {
  const browser = browserStorage();
  try {
    const first = goals.migrateManifestations(profile);
    const second = makeGoal();
    onboarding.saveOnboardingProfile(
      goals.withManifestations(first, {
        ...first.manifestations,
        goals: [...first.manifestations.goals, second],
      }),
    );
    const a = {
      ...alignment.buildResult(draft),
      manifestationId: first.manifestations.primaryGoalId,
    };
    const b = { ...alignment.buildResult(draft), manifestationId: second.id };
    alignment.saveCheckIn(a);
    alignment.saveCheckIn(b);
    alignment.updateCheckIn({ ...b, readAt: "2026-10-19T18:00:00Z" });
    alignment.updateCheckIn({ ...b, aiQuote: "A later reading" });
    assert.equal(alignment.getCheckInById(b.id).readAt, "2026-10-19T18:00:00Z");
    alignment.clearCheckIns(a.manifestationId);
    assert.equal(alignment.getAllCheckIns().length, 1);
    assert.equal(alignment.getCheckInById(b.id).aiQuote, "A later reading");
  } finally {
    browser.cleanup();
  }
});
