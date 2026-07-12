"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { Moon, Save, ShieldCheck, SlidersHorizontal, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  getCurrentAccount,
  syncLocalDataToAccount,
  updateAccountName,
} from "@/lib/account-data";
import { getCheckIns } from "@/lib/alignment";
import { getJournalEntries } from "@/lib/journal-storage";
import { getOnboardingProfile } from "@/lib/onboarding-storage";

const THEME_KEY = "clearpth.theme";

type Theme = "dark" | "light";

type AccountUser = {
  email?: string;
  id: string;
  user_metadata?: {
    full_name?: string;
    name?: string;
  };
};

export default function SettingsPage() {
  const [user, setUser] = useState<AccountUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [theme, setTheme] = useState<Theme>("light");
  const [profileMessage, setProfileMessage] = useState("");
  const [accountMessage, setAccountMessage] = useState("");
  const [savingName, setSavingName] = useState(false);

  const stats = {
    checkIns: getCheckIns().length,
    journalEntries: getJournalEntries().length,
    hasProfile: Boolean(getOnboardingProfile()),
  };

  useEffect(() => {
    queueMicrotask(() => {
      const savedTheme = localStorage.getItem(THEME_KEY);
      setTheme(savedTheme === "dark" ? "dark" : "light");

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

  const chooseTheme = (nextTheme: Theme) => {
    localStorage.setItem(THEME_KEY, nextTheme);
    setTheme(nextTheme);
    document.documentElement.classList.toggle("light", nextTheme === "light");
    document.documentElement.classList.toggle("dark", nextTheme === "dark");
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
          <Button asChild className="mt-6">
            <Link href="/login">Sign In</Link>
          </Button>
        </section>
      </main>
    );
  }

  return (
    <main className="container py-8 md:py-12">
      <section className="mx-auto max-w-5xl">
        <p className="clearpth-page-kicker">Settings</p>
        <h1 className="clearpth-page-title">Profile And Preferences</h1>
        <p className="mt-4 max-w-2xl leading-7 text-muted-foreground">
          Signed in as {getAccountName(user) ?? user.email}.
        </p>
      </section>

      <section className="mx-auto mt-8 grid max-w-5xl gap-5 lg:grid-cols-[1fr_0.8fr]">
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
          {profileMessage ? (
            <p className="mt-3 text-sm text-muted-foreground">
              {profileMessage}
            </p>
          ) : null}
        </article>

        <article className="aura-glass rounded-lg p-5 md:p-6">
          <div className="flex items-center gap-3">
            <SlidersHorizontal className="h-5 w-5 text-primary" aria-hidden />
            <p className="text-xs uppercase tracking-[0.24em] text-primary">
              Appearance
            </p>
          </div>
          <div className="mt-5 grid grid-cols-2 gap-3">
            <Button
              type="button"
              variant={theme === "dark" ? "default" : "secondary"}
              onClick={() => chooseTheme("dark")}
            >
              <Moon className="h-4 w-4" aria-hidden />
              Dark
            </Button>
            <Button
              type="button"
              variant={theme === "light" ? "default" : "secondary"}
              onClick={() => chooseTheme("light")}
            >
              <Sun className="h-4 w-4" aria-hidden />
              Light
            </Button>
          </div>
        </article>
      </section>

      <section className="mx-auto mt-5 grid max-w-5xl gap-4 md:grid-cols-3">
        <SettingsStat label="Check-ins" value={String(stats.checkIns)} />
        <SettingsStat
          label="Journal entries"
          value={String(stats.journalEntries)}
        />
        <SettingsStat
          label="Setup profile"
          value={stats.hasProfile ? "Saved" : "Open"}
        />
      </section>

      <section className="aura-glass mx-auto mt-8 rounded-lg p-5 md:p-6">
        <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-primary">
              Account
            </p>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
              Adjust the personal setup that shapes your check-ins, Guide, and
              pattern analysis.
            </p>
            {accountMessage ? (
              <p className="mt-3 text-sm text-muted-foreground">
                {accountMessage}
              </p>
            ) : null}
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button asChild variant="secondary">
              <Link href="/onboarding">Update Setup</Link>
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
