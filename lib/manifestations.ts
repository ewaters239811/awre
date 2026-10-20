import { createId } from "@/lib/id";
import { MANIFESTATION_CATEGORIES } from "@/lib/types";
import type {
  ManifestationGoal,
  ManifestationState,
  OnboardingProfile,
  GoalDevelopment,
} from "@/lib/types";

export function createManifestation(
  input: Pick<
    ManifestationGoal,
    "outcome" | "category" | "identity" | "targetDate"
  >,
): ManifestationGoal {
  validateGoal(input);
  const now = new Date().toISOString();
  return {
    ...input,
    outcome: input.outcome.trim(),
    identity: input.identity.trim(),
    id: createId("goal"),
    status: "active",
    createdAt: now,
    updatedAt: now,
    developments: [],
  };
}

export function validateGoal(
  input: Pick<
    ManifestationGoal,
    "outcome" | "category" | "identity" | "targetDate"
  >,
) {
  if (!input.outcome.trim() || input.outcome.length > 2000)
    throw new Error("Describe your desired outcome in 1 to 2,000 characters.");
  if (!MANIFESTATION_CATEGORIES.includes(input.category))
    throw new Error("Choose a goal category.");
  if (input.identity.length > 2000)
    throw new Error("Keep your identity statement under 2,000 characters.");
  if (input.targetDate) {
    const parsed = new Date(`${input.targetDate}T12:00:00Z`);
    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(input.targetDate) ||
      !Number.isFinite(parsed.getTime()) ||
      parsed.toISOString().slice(0, 10) !== input.targetDate
    )
      throw new Error("Choose a valid target date.");
  }
}

// Deterministic IDs keep the same legacy goal across devices and repeated migrations.
export function legacyManifestationId(profile: OnboardingProfile) {
  let hash = 2166136261;
  for (const char of `${profile.createdAt}|${profile.primaryGoal}`)
    hash = Math.imul(hash ^ char.charCodeAt(0), 16777619);
  return `legacy-${(hash >>> 0).toString(16)}`;
}

export function migrateManifestations(
  profile: OnboardingProfile,
): OnboardingProfile {
  if (profile.manifestations?.version === 1) return profile;
  const id = legacyManifestationId(profile);
  const goal: ManifestationGoal = {
    id,
    outcome: profile.primaryGoal,
    category: "Other",
    identity: "",
    status: "active",
    createdAt: profile.createdAt,
    updatedAt: profile.updatedAt,
    developments: [],
  };
  return {
    ...profile,
    manifestations: {
      version: 1,
      goals: profile.primaryGoal.trim() ? [goal] : [],
      primaryGoalId: profile.primaryGoal.trim() ? id : null,
      legacyGoalId: id,
      innerFoundation: "",
    },
  };
}

export function primaryManifestation(profile: OnboardingProfile | null) {
  if (!profile) return null;
  const state = migrateManifestations(profile).manifestations!;
  return (
    state.goals.find(
      (goal) => goal.id === state.primaryGoalId && goal.status === "active",
    ) ?? null
  );
}

export function withManifestations(
  profile: OnboardingProfile,
  state: ManifestationState,
): OnboardingProfile {
  const primary = state.goals.find(
    (goal) => goal.id === state.primaryGoalId && goal.status === "active",
  );
  if (state.primaryGoalId && !primary)
    throw new Error("Choose an active goal for your daily focus.");
  if (new Set(state.goals.map((goal) => goal.id)).size !== state.goals.length)
    throw new Error("Goal IDs must be unique.");
  for (const goal of state.goals) validateGoal(goal);
  if (state.innerFoundation.length > 2000)
    throw new Error("Keep your foundation under 2,000 characters.");
  return {
    ...profile,
    primaryGoal: primary?.outcome ?? "",
    manifestations: state,
    updatedAt: new Date().toISOString(),
  };
}

export function selectManifestation(profile: OnboardingProfile, id: string) {
  const state = migrateManifestations(profile).manifestations!;
  return withManifestations(profile, { ...state, primaryGoalId: id });
}

export function setManifestationStatus(
  profile: OnboardingProfile,
  id: string,
  status: ManifestationGoal["status"],
) {
  const state = migrateManifestations(profile).manifestations!;
  if (!state.goals.some((goal) => goal.id === id))
    throw new Error("Goal not found.");
  const now = new Date().toISOString();
  const goals = state.goals.map((goal) =>
    goal.id === id
      ? {
          ...goal,
          status,
          updatedAt: now,
          completedAt: status === "completed" ? now : undefined,
          developments:
            goal.status === status
              ? goal.developments
              : [
                  {
                    id: createId("progress"),
                    kind: "note" as const,
                    text:
                      status === "completed"
                        ? "Desired reality completed"
                        : status === "archived"
                          ? "Desired reality archived"
                          : "Desired reality reactivated",
                    createdAt: now,
                  },
                  ...goal.developments,
                ],
        }
      : goal,
  );
  const primaryGoalId =
    state.primaryGoalId === id && status !== "active"
      ? (goals.find((goal) => goal.status === "active")?.id ?? null)
      : (state.primaryGoalId ??
        goals.find((goal) => goal.status === "active")?.id ??
        null);
  return withManifestations(profile, { ...state, goals, primaryGoalId });
}

export function addDevelopment(
  goal: ManifestationGoal,
  kind: GoalDevelopment["kind"],
  text: string,
): ManifestationGoal {
  if (!text.trim() || text.length > 2000)
    throw new Error("Write a short milestone, action, or progress note.");
  const now = new Date().toISOString();
  return {
    ...goal,
    updatedAt: now,
    developments: [
      {
        id: createId("progress"),
        kind,
        text: text.trim(),
        createdAt: now,
        ...(kind === "action" ? { completedAt: now } : {}),
      },
      ...goal.developments,
    ],
  };
}

export function reclassifyLegacyFoundation(
  profile: OnboardingProfile,
  id: string,
) {
  const state = migrateManifestations(profile).manifestations!;
  const goal = state.goals.find(
    (item) => item.id === id && item.id === state.legacyGoalId,
  );
  if (!goal) throw new Error("Choose your original statement.");
  const next = setManifestationStatus(profile, id, "archived");
  const foundation = state.innerFoundation.includes(goal.outcome)
    ? state.innerFoundation
    : [state.innerFoundation, goal.outcome].filter(Boolean).join("\n\n");
  return withManifestations(next, {
    ...next.manifestations!,
    innerFoundation: foundation,
  });
}

// Legacy Settings/Setup forms can still edit the primary outcome without losing goals.
export function reconcileManifestations(profile: OnboardingProfile) {
  const migrated = migrateManifestations(profile);
  const state = migrated.manifestations!;
  const primary = primaryManifestation(migrated);
  if (
    primary &&
    profile.primaryGoal.trim() &&
    primary.outcome !== profile.primaryGoal
  ) {
    return withManifestations(migrated, {
      ...state,
      goals: state.goals.map((goal) =>
        goal.id === primary.id
          ? {
              ...goal,
              outcome: profile.primaryGoal.trim(),
              updatedAt: profile.updatedAt,
            }
          : goal,
      ),
    });
  }
  return migrated;
}

export function goalIdForRecord(
  record: { manifestationId?: string },
  profile: OnboardingProfile | null,
) {
  return (
    record.manifestationId ??
    (profile
      ? migrateManifestations(profile).manifestations?.legacyGoalId
      : undefined)
  );
}

export function profileForCheckIn(
  profile: OnboardingProfile | null,
  result: {
    manifestationId?: string;
    desiredReality?: string;
    innerFoundation?: string;
  },
) {
  if (!profile) return null;
  const state = migrateManifestations(profile).manifestations!;
  const goal = state.goals.find(
    (item) => item.id === goalIdForRecord(result, profile),
  );
  return {
    ...profile,
    primaryGoal: result.desiredReality ?? goal?.outcome ?? profile.primaryGoal,
    desiredState: goal?.identity || profile.desiredState,
    manifestations: {
      ...state,
      goals: goal ? [goal] : [],
      primaryGoalId: goal?.id ?? null,
      innerFoundation: result.innerFoundation ?? state.innerFoundation,
    },
  };
}
