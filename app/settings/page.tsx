"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Bell,
  Database,
  Headphones,
  Info,
  LogOut,
  Save,
  ShieldCheck,
  Sparkles,
  Target,
  UserPlus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  getCurrentAccount,
  saveOnboardingProfileToAccount,
  signOutOfAccount,
  syncLocalDataToAccount,
  updateAccountName,
} from "@/lib/account-data";
import { getCheckIns } from "@/lib/alignment";
import { getJournalEntries } from "@/lib/journal-storage";
import {
  createEmptyOnboardingProfile,
  getOnboardingProfile,
  saveOnboardingProfile,
} from "@/lib/onboarding-storage";
import type { OnboardingProfile } from "@/lib/types";

type AccountUser = {
  email?: string;
  id: string;
  user_metadata?: {
    full_name?: string;
    name?: string;
  };
};

const AMBIENT_SOUND_KEY = "clearpth.ambientNoise.enabled";

export default function SettingsPage() {
  const router = useRouter();
  const [user, setUser] = useState<AccountUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [profile, setProfile] = useState<OnboardingProfile>(() =>
    createEmptyOnboardingProfile(),
  );
  const [ambientSound, setAmbientSound] = useState(false);
  const [profileMessage, setProfileMessage] = useState("");
  const [desireMessage, setDesireMessage] = useState("");
  const [accountMessage, setAccountMessage] = useState("");
  const [savingName, setSavingName] = useState(false);
  const [savingDesire, setSavingDesire] = useState(false);

  const stats = {
    checkIns: getCheckIns().length,
    journalEntries: getJournalEntries().length,
    hasProfile: Boolean(profile.primaryGoal || profile.desiredState),
  };

  useEffect(() => {
    queueMicrotask(() => {
      setAmbientSound(localStorage.getItem(AMBIENT_SOUND_KEY) === "true");

      getCurrentAccount()
        .then((account) => {
          setUser(account);
          setName(account ? getAccountName(account) ?? "" : "");

          if (!account) return;

          return syncLocalDataToAccount().catch(() => {
            setAccountMessage(
              "Your profile needs the Supabase tables before account records can be stored.",
            );
          });
        })
        .then(() => {
          setProfile(getOnboardingProfile() ?? createEmptyOnboardingProfile());
        })
        .finally(() => setLoading(false));
    });
  }, []);

  const saveName = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setProfileMessage("");

    if (!name.trim()) {
      setProfileMessage("Enter a name before saving.");
      return;
    }

    setSavingName(true);

    try {
      const updatedUser = await updateAccountName(name);
      setUser(updatedUser);
      setName(getAccountName(updatedUser) ?? "");
      setProfileMessage("Profile updated.");
    } catch {
      setProfileMessage("Could not update your profile. Please try again.");
    } finally {
      setSavingName(false);
    }
  };

  const saveDesiredReality = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setDesireMessage("");

    if (!profile.primaryGoal.trim() || !profile.desiredState.trim()) {
      setDesireMessage("Add what you want and how you want to feel.");
      return;
    }

    const nextProfile = {
      ...profile,
      primaryGoal: profile.primaryGoal.trim(),
      currentChallenge: profile.currentChallenge.trim(),
      desiredState: profile.desiredState.trim(),
    };

    setSavingDesire(true);

    try {
      saveOnboardingProfile(nextProfile);
      await saveOnboardingProfileToAccount(nextProfile);
      setProfile(getOnboardingProfile() ?? nextProfile);
      setDesireMessage("Desired reality updated.");
    } catch {
      setDesireMessage("Could not update this yet. Please try again.");
    } finally {
      setSavingDesire(false);
    }
  };

  const updateAmbientSound = (enabled: boolean) => {
    setAmbientSound(enabled);
    localStorage.setItem(AMBIENT_SOUND_KEY, enabled ? "true" : "false");
  };

  const signOut = async () => {
    await signOutOfAccount();
    setUser(null);
    router.push("/");
  };

  if (loading) {
    return <main className="container py-12">Loading settings...</main>;
  }

  if (!user) {
    return (
      <main className="container py-8 md:py-12">
        <section className="aura-glass mx-auto max-w-2xl rounded-lg p-6">
          <p className="clearpth-page-kicker">Settings</p>
          <h1 className="mt-3 font-serif text-4xl font-semibold">
            Sign in to manage settings.
          </h1>
          <p className="mt-4 leading-7 text-muted-foreground">
            Your profile settings are available after you sign in.
          </p>
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <Button asChild>
              <Link href="/login">Sign In</Link>
            </Button>
            <Button asChild variant="secondary">
              <Link href="/login?mode=sign-up">
                <UserPlus className="h-4 w-4" aria-hidden />
                Create Account
              </Link>
            </Button>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="container py-8 md:py-12">
      <section className="mx-auto max-w-5xl">
        <p className="clearpth-page-kicker">Settings</p>
        <h1 className="clearpth-page-title">Your Space</h1>
        <p className="mt-4 max-w-2xl text-[15px] leading-7 text-muted-foreground md:text-base">
          Signed in as {getAccountName(user) ?? user.email}.
        </p>
      </section>

      <section className="mx-auto mt-8 grid max-w-5xl gap-5 lg:grid-cols-[0.9fr_1.1fr]">
        <article className="aura-glass rounded-lg p-5 md:p-6">
          <div className="flex items-center gap-3">
            <ShieldCheck className="h-5 w-5 text-primary" aria-hidden />
            <p className="text-xs uppercase tracking-[0.24em] text-primary">
              Identity
            </p>
          </div>
          <form
            className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-end"
            onSubmit={saveName}
          >
            <label className="flex-1 text-sm font-medium">
              Name
              <input
                className="mt-2 h-12 w-full rounded-md border border-input bg-card px-4 text-base outline-none transition focus:ring-2 focus:ring-ring md:text-sm"
                type="text"
                value={name}
                onChange={(event) => {
                  setName(event.target.value);
                  setProfileMessage("");
                }}
                autoComplete="name"
              />
            </label>
            <Button type="submit" disabled={savingName}>
              <Save className="h-4 w-4" aria-hidden />
              {savingName ? "Saving..." : "Save Name"}
            </Button>
          </form>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            Email: {user.email}
          </p>
          {profileMessage ? (
            <p className="mt-3 text-sm text-muted-foreground">
              {profileMessage}
            </p>
          ) : null}
        </article>

        <article className="aura-glass rounded-lg p-5 md:p-6">
          <div className="flex items-center gap-3">
            <Target className="h-5 w-5 text-primary" aria-hidden />
            <p className="text-xs uppercase tracking-[0.24em] text-primary">
              Desired Reality
            </p>
          </div>
          <form className="mt-5 space-y-4" onSubmit={saveDesiredReality}>
            <SettingsField
              label="What do you want?"
              value={profile.primaryGoal}
              onChange={(value) => {
                setProfile((current) => ({ ...current, primaryGoal: value }));
                setDesireMessage("");
              }}
            />
            <SettingsField
              label="How do you want to feel when it is real?"
              value={profile.desiredState}
              onChange={(value) => {
                setProfile((current) => ({ ...current, desiredState: value }));
                setDesireMessage("");
              }}
            />
            <SettingsField
              label="What currently feels in the way?"
              value={profile.currentChallenge}
              onChange={(value) => {
                setProfile((current) => ({
                  ...current,
                  currentChallenge: value,
                }));
                setDesireMessage("");
              }}
            />
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button type="submit" disabled={savingDesire}>
                <Save className="h-4 w-4" aria-hidden />
                {savingDesire ? "Saving..." : "Save Desired Reality"}
              </Button>
              <Button asChild variant="secondary">
                <Link href="/onboarding">Redo Setup</Link>
              </Button>
            </div>
          </form>
          {desireMessage ? (
            <p className="mt-3 text-sm text-muted-foreground">
              {desireMessage}
            </p>
          ) : null}
        </article>
      </section>

      <section className="mx-auto mt-5 grid max-w-5xl gap-4 md:grid-cols-3">
        <SettingsStat label="Check-ins" value={String(stats.checkIns)} />
        <SettingsStat
          label="Journal entries"
          value={String(stats.journalEntries)}
        />
        <SettingsStat
          label="Personal direction"
          value={stats.hasProfile ? "Saved" : "Open"}
        />
      </section>

      <section className="mx-auto mt-8 grid max-w-5xl gap-5 lg:grid-cols-2">
        <article className="aura-glass rounded-lg p-5 md:p-6">
          <div className="flex items-center gap-3">
            <Headphones className="h-5 w-5 text-primary" aria-hidden />
            <p className="text-xs uppercase tracking-[0.24em] text-primary">
              Meditation
            </p>
          </div>
          <p className="mt-4 text-sm leading-6 text-muted-foreground">
            Keep the app calm while you move through check-ins, journaling, and
            meditation.
          </p>
          <div className="mt-5 rounded-md border border-border/60 bg-card/35 p-4">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-medium">Ambient sound</p>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">
                  A soft background tone outside the cover, login, and setup
                  screens.
                </p>
              </div>
              <div className="grid grid-cols-2 rounded-full border border-border bg-background/55 p-1">
                <button
                  type="button"
                  className={`rounded-full px-4 py-2 text-sm transition ${
                    ambientSound
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground"
                  }`}
                  onClick={() => updateAmbientSound(true)}
                >
                  On
                </button>
                <button
                  type="button"
                  className={`rounded-full px-4 py-2 text-sm transition ${
                    !ambientSound
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground"
                  }`}
                  onClick={() => updateAmbientSound(false)}
                >
                  Off
                </button>
              </div>
            </div>
          </div>
          <p className="mt-4 text-sm leading-6 text-muted-foreground">
            Guided meditations are set to a slower, spacious pace.
          </p>
        </article>

        <article className="aura-glass rounded-lg p-5 md:p-6">
          <div className="flex items-center gap-3">
            <Bell className="h-5 w-5 text-primary" aria-hidden />
            <p className="text-xs uppercase tracking-[0.24em] text-primary">
              Reminders
            </p>
          </div>
          <p className="mt-4 text-sm leading-6 text-muted-foreground">
            Morning check-in and evening journal reminders will fit here when
            ClearPth adds push notifications.
          </p>
          <div className="mt-5 grid gap-3">
            <ReminderRow title="Morning check-in" detail="Start the day clear." />
            <ReminderRow title="Evening journal" detail="Close the day honestly." />
          </div>
        </article>
      </section>

      <section className="mx-auto mt-5 grid max-w-5xl gap-5 lg:grid-cols-2">
        <article className="aura-glass rounded-lg p-5 md:p-6">
          <div className="flex items-center gap-3">
            <Database className="h-5 w-5 text-primary" aria-hidden />
            <p className="text-xs uppercase tracking-[0.24em] text-primary">
              Data
            </p>
          </div>
          <p className="mt-4 text-sm leading-6 text-muted-foreground">
            Review your saved check-ins, journal entries, and progress patterns.
          </p>
          <div className="mt-5 flex flex-col gap-3 sm:flex-row">
            <Button asChild variant="secondary">
              <Link href="/dashboard">View Progress</Link>
            </Button>
            <Button asChild variant="secondary">
              <Link href="/history">History Archive</Link>
            </Button>
          </div>
        </article>

        <article className="aura-glass rounded-lg p-5 md:p-6">
          <div className="flex items-center gap-3">
            <Sparkles className="h-5 w-5 text-primary" aria-hidden />
            <p className="text-xs uppercase tracking-[0.24em] text-primary">
              Resources
            </p>
          </div>
          <p className="mt-4 text-sm leading-6 text-muted-foreground">
            Keep the model, teaching, and background pages close without making
            them part of the daily flow.
          </p>
          <div className="mt-5 flex flex-col gap-3 sm:flex-row">
            <Button asChild variant="secondary">
              <Link href="/teachings">Teaching</Link>
            </Button>
            <Button asChild variant="secondary">
              <Link href="/about">About</Link>
            </Button>
          </div>
        </article>
      </section>

      <section className="aura-glass mx-auto mt-5 max-w-5xl rounded-lg p-5 md:p-6">
        <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <Info className="h-5 w-5 text-primary" aria-hidden />
              <p className="text-xs uppercase tracking-[0.24em] text-primary">
                Support
              </p>
            </div>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
              ClearPth is for self-reflection and personal growth. It is not
              medical care, therapy, diagnosis, or crisis support. If you ever
              feel unsafe, contact emergency services or someone you trust.
            </p>
            {accountMessage ? (
              <p className="mt-3 text-sm text-muted-foreground">
                {accountMessage}
              </p>
            ) : null}
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button variant="secondary" onClick={signOut}>
              <LogOut className="h-4 w-4" aria-hidden />
              Sign Out
            </Button>
          </div>
        </div>
      </section>
    </main>
  );
}

function getAccountName(user: AccountUser) {
  const name =
    user.user_metadata?.full_name?.trim() || user.user_metadata?.name?.trim();

  return name || null;
}

function SettingsStat({ label, value }: { label: string; value: string }) {
  return (
    <article className="aura-glass rounded-lg p-5">
      <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">
        {label}
      </p>
      <p className="mt-3 font-serif text-4xl font-semibold">{value}</p>
    </article>
  );
}

function SettingsField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block text-sm font-medium">
      {label}
      <textarea
        className="mt-2 min-h-24 w-full resize-none rounded-md border border-input bg-card px-4 py-3 text-base leading-7 outline-none transition focus:ring-2 focus:ring-ring md:text-sm"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}

function ReminderRow({ title, detail }: { title: string; detail: string }) {
  return (
    <div className="rounded-md border border-border/60 bg-card/35 p-4">
      <p className="font-medium">{title}</p>
      <p className="mt-1 text-sm leading-6 text-muted-foreground">{detail}</p>
    </div>
  );
}
