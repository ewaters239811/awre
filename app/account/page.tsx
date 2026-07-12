"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Settings, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  getCurrentAccount,
  syncLocalDataToAccount,
} from "@/lib/account-data";
import { getCheckIns } from "@/lib/alignment";
import { getJournalEntries } from "@/lib/journal-storage";
import { getOnboardingProfile } from "@/lib/onboarding-storage";

type AccountUser = {
  email?: string;
  id: string;
  user_metadata?: {
    full_name?: string;
    name?: string;
  };
};

export default function AccountPage() {
  const [user, setUser] = useState<AccountUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  const stats = {
    checkIns: getCheckIns().length,
    journalEntries: getJournalEntries().length,
    hasProfile: Boolean(getOnboardingProfile()),
  };

  useEffect(() => {
    queueMicrotask(() => {
      getCurrentAccount()
        .then((account) => {
          setUser(account);

          if (!account) return;

          return syncLocalDataToAccount()
            .then((result) => {
              if (!result) return;
              setMessage(
                `Loaded ${result.checkIns} check-ins and ${result.journalEntries} journal entries from your profile.`,
              );
            })
            .catch(() => {
              setMessage(
                "Automatic saving needs the Supabase tables to be created.",
              );
            });
        })
        .finally(() => setLoading(false));
    });
  }, []);

  if (loading) {
    return <main className="container py-12">Loading account...</main>;
  }

  if (!user) {
    return (
      <main className="container py-8 md:py-12">
        <section className="aura-glass mx-auto max-w-2xl rounded-lg p-6">
          <p className="clearpth-page-kicker">Account</p>
          <h1 className="mt-3 font-serif text-4xl font-semibold">
            You are not signed in.
          </h1>
          <p className="mt-4 leading-7 text-muted-foreground">
            Sign in to save your ClearPth data to your profile and access it
            from another device.
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
        <p className="clearpth-page-kicker">Account</p>
        <h1 className="clearpth-page-title">
          {getAccountName(user) ? `${getAccountName(user)}'s Profile` : "Your ClearPth Profile"}
        </h1>
        <p className="mt-4 max-w-2xl leading-7 text-muted-foreground">
          Signed in as {getAccountName(user) ?? user.email}. Your record is
          connected to this profile.
        </p>
      </section>

      <section className="mx-auto mt-8 grid max-w-5xl gap-4 md:grid-cols-3">
        <AccountStat label="Check-ins" value={String(stats.checkIns)} />
        <AccountStat label="Journal entries" value={String(stats.journalEntries)} />
        <AccountStat label="Setup profile" value={stats.hasProfile ? "Saved" : "Open"} />
      </section>

      <section className="aura-glass mx-auto mt-8 max-w-5xl rounded-lg p-5 md:p-6">
        <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <ShieldCheck className="h-5 w-5 text-primary" aria-hidden />
              <p className="text-xs uppercase tracking-[0.24em] text-primary">
                Profile
              </p>
            </div>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
              Your ClearPth record is available to this account, including your
              check-ins, journal entries, and setup profile.
            </p>
            {message ? (
              <p className="mt-3 text-sm text-muted-foreground">{message}</p>
            ) : null}
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button asChild variant="secondary">
              <Link href="/settings">
                <Settings className="h-4 w-4" aria-hidden />
                Open Settings
              </Link>
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

function AccountStat({ label, value }: { label: string; value: string }) {
  return (
    <article className="aura-glass rounded-lg p-5">
      <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">
        {label}
      </p>
      <p className="mt-3 font-serif text-4xl font-semibold">{value}</p>
    </article>
  );
}
