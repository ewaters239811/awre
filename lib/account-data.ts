"use client";

import {
  clearCheckIns,
  getCheckInDateKey,
  replaceCheckIns,
} from "@/lib/alignment";
import { replaceJournalEntries } from "@/lib/journal-storage";
import {
  clearOnboardingProfile,
  saveOnboardingProfile,
} from "@/lib/onboarding-storage";
import { clearGuideConversations } from "@/lib/guide-storage";
import { createSupabaseBrowserClient, isSupabaseConfigured } from "@/lib/supabase/client";
import type { CheckInResult, JournalEntry, OnboardingProfile } from "@/lib/types";

export type AccountSyncResult = {
  checkIns: number;
  journalEntries: number;
  hasOnboardingProfile: boolean;
};

type JsonRow<T> = {
  data: T;
};

export async function getCurrentAccount() {
  if (!isSupabaseConfigured()) return null;
  const supabase = createSupabaseBrowserClient();
  const { data } = await supabase.auth.getUser();
  return data.user;
}

export async function signOutOfAccount() {
  const supabase = createSupabaseBrowserClient();
  await supabase.auth.signOut();
  clearLocalAccountData();
}

export async function signInAsGuest() {
  if (!isSupabaseConfigured()) {
    throw new Error("Supabase is not configured.");
  }

  const supabase = createSupabaseBrowserClient();
  const { data, error } = await supabase.auth.signInAnonymously();

  if (error) throw error;
  return data.user;
}

export function clearLocalAccountData() {
  clearCheckIns();
  replaceJournalEntries([]);
  clearOnboardingProfile();
  clearGuideConversations();

  try {
    localStorage.removeItem("clearpth.beingAnalysis.v1");
    localStorage.removeItem("aura.dailyRituals.v1");
  } catch {
    // Storage can be unavailable in private browsing modes.
  }
}

export async function updateAccountName(name: string) {
  const trimmedName = name.trim();
  if (!trimmedName) throw new Error("Name is required.");

  const supabase = createSupabaseBrowserClient();
  const { data, error } = await supabase.auth.updateUser({
    data: {
      full_name: trimmedName,
    },
  });

  if (error) throw error;
  return data.user;
}

export async function syncLocalDataToAccount(): Promise<AccountSyncResult | null> {
  if (!isSupabaseConfigured()) return null;

  const supabase = createSupabaseBrowserClient();
  const { data } = await supabase.auth.getUser();
  const user = data.user;

  if (!user) return null;

  const [remoteCheckIns, remoteJournalEntries, remoteProfile] =
    await Promise.all([
      fetchRemoteCheckIns(),
      fetchRemoteJournalEntries(),
      fetchRemoteOnboardingProfile(),
    ]);

  replaceCheckIns(remoteCheckIns);
  replaceJournalEntries(remoteJournalEntries);

  if (remoteProfile) {
    saveOnboardingProfile(remoteProfile);
  }

  return {
    checkIns: remoteCheckIns.length,
    journalEntries: remoteJournalEntries.length,
    hasOnboardingProfile: Boolean(remoteProfile),
  };
}

export async function saveCheckInToAccount(checkIn: CheckInResult) {
  const userId = await getCurrentUserId();
  if (!userId) throw new Error("Sign in before saving a check-in.");

  const supabase = createSupabaseBrowserClient();
  const { error } = await supabase.from("check_ins").upsert(
    {
      id: checkIn.id,
      user_id: userId,
      created_at: checkIn.createdAt,
      data: checkIn,
    },
    { onConflict: "id" },
  );

  if (error) throw error;
}

export async function saveJournalEntryToAccount(entry: JournalEntry) {
  const userId = await getCurrentUserId();
  if (!userId) throw new Error("Sign in before saving a journal entry.");

  const supabase = createSupabaseBrowserClient();
  const { error } = await supabase.from("journal_entries").upsert(
    {
      id: entry.id,
      user_id: userId,
      date: entry.date,
      created_at: entry.createdAt,
      updated_at: entry.updatedAt,
      data: entry,
    },
    { onConflict: "id" },
  );

  if (error) throw error;
}

export async function saveOnboardingProfileToAccount(profile: OnboardingProfile) {
  const userId = await getCurrentUserId();
  if (!userId) throw new Error("Sign in before saving a setup profile.");

  const supabase = createSupabaseBrowserClient();
  const { error } = await supabase.from("onboarding_profiles").upsert(
    {
      user_id: userId,
      updated_at: profile.updatedAt,
      data: profile,
    },
    { onConflict: "user_id" },
  );

  if (error) throw error;
}

export async function fetchRemoteCheckIns() {
  const supabase = createSupabaseBrowserClient();
  const { data, error } = await supabase
    .from("check_ins")
    .select("data")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return ((data ?? []) as JsonRow<CheckInResult>[]).map((row) =>
    normalizeCheckIn(row.data),
  );
}

export async function fetchRemoteJournalEntries() {
  const supabase = createSupabaseBrowserClient();
  const { data, error } = await supabase
    .from("journal_entries")
    .select("data")
    .order("date", { ascending: false });

  if (error) throw error;
  return ((data ?? []) as JsonRow<JournalEntry>[]).map((row) => row.data);
}

export async function fetchRemoteOnboardingProfile() {
  const supabase = createSupabaseBrowserClient();
  const { data, error } = await supabase
    .from("onboarding_profiles")
    .select("data")
    .maybeSingle();

  if (error) throw error;
  return (data as JsonRow<OnboardingProfile> | null)?.data ?? null;
}

export async function clearRemoteCheckIns() {
  if (!isSupabaseConfigured()) return;

  const supabase = createSupabaseBrowserClient();
  const { data } = await supabase.auth.getUser();
  const user = data.user;
  if (!user) return;

  const { error } = await supabase
    .from("check_ins")
    .delete()
    .eq("user_id", user.id);

  if (error) throw error;
}

async function getCurrentUserId() {
  if (!isSupabaseConfigured()) return null;

  const supabase = createSupabaseBrowserClient();
  const { data } = await supabase.auth.getUser();
  return data.user?.id ?? null;
}

function normalizeCheckIn(checkIn: CheckInResult): CheckInResult {
  const checkInDate = getCheckInDateKey(checkIn);

  return {
    ...checkIn,
    checkInDate,
  };
}
