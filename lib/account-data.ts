"use client";

import {
  getCheckIns,
  replaceCheckIns,
} from "@/lib/alignment";
import {
  getJournalEntries,
  replaceJournalEntries,
} from "@/lib/journal-storage";
import { getOnboardingProfile, saveOnboardingProfile } from "@/lib/onboarding-storage";
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

  await Promise.all([
    upsertCheckIns(user.id),
    upsertJournalEntries(user.id),
    upsertOnboardingProfile(user.id),
  ]);

  const [remoteCheckIns, remoteJournalEntries, remoteProfile] =
    await Promise.all([
      fetchRemoteCheckIns(),
      fetchRemoteJournalEntries(),
      fetchRemoteOnboardingProfile(),
    ]);

  replaceCheckIns(mergeById(getCheckIns(), remoteCheckIns));
  replaceJournalEntries(mergeById(getJournalEntries(), remoteJournalEntries));

  if (remoteProfile) {
    saveOnboardingProfile(remoteProfile);
  }

  return {
    checkIns: remoteCheckIns.length,
    journalEntries: remoteJournalEntries.length,
    hasOnboardingProfile: Boolean(remoteProfile),
  };
}

export async function fetchRemoteCheckIns() {
  const supabase = createSupabaseBrowserClient();
  const { data, error } = await supabase
    .from("check_ins")
    .select("data")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return ((data ?? []) as JsonRow<CheckInResult>[]).map((row) => row.data);
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

async function upsertCheckIns(userId: string) {
  const checkIns = getCheckIns();
  if (checkIns.length === 0) return;

  const supabase = createSupabaseBrowserClient();
  const { error } = await supabase.from("check_ins").upsert(
    checkIns.map((checkIn) => ({
      id: checkIn.id,
      user_id: userId,
      created_at: checkIn.createdAt,
      data: checkIn,
    })),
    { onConflict: "id" },
  );

  if (error) throw error;
}

async function upsertJournalEntries(userId: string) {
  const entries = getJournalEntries();
  if (entries.length === 0) return;

  const supabase = createSupabaseBrowserClient();
  const { error } = await supabase.from("journal_entries").upsert(
    entries.map((entry) => ({
      id: entry.id,
      user_id: userId,
      date: entry.date,
      created_at: entry.createdAt,
      updated_at: entry.updatedAt,
      data: entry,
    })),
    { onConflict: "id" },
  );

  if (error) throw error;
}

async function upsertOnboardingProfile(userId: string) {
  const profile = getOnboardingProfile();
  if (!profile) return;

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

function mergeById<T extends { id: string }>(localItems: T[], remoteItems: T[]) {
  const byId = new Map<string, T>();

  for (const item of [...remoteItems, ...localItems]) {
    byId.set(item.id, item);
  }

  return Array.from(byId.values());
}
