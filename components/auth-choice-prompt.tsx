"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowRight, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { clearLocalAccountData, getCurrentAccount } from "@/lib/account-data";

export function AuthChoicePrompt() {
  const pathname = usePathname();
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    queueMicrotask(() => {
      getCurrentAccount().then((user) => {
        if (!user) clearLocalAccountData();
        setShowPrompt(!user);
      });
    });
  }, [pathname]);

  const continueAsGuest = () => {
    clearLocalAccountData();
    setShowPrompt(false);
  };

  if (!showPrompt || pathname === "/login") return null;

  return (
    <div className="fixed inset-x-0 top-20 z-[60] px-4 sm:bottom-6 sm:top-auto lg:bottom-4">
      <section className="aura-glass mx-auto max-w-2xl rounded-2xl p-4 shadow-2xl sm:rounded-lg sm:p-5">
        <p className="text-xs uppercase tracking-[0.24em] text-primary">
          Begin Your Record
        </p>
        <h2 className="mt-2 font-serif text-2xl font-semibold leading-tight">
          Save your path, or explore first.
        </h2>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          An account keeps your check-ins and journal connected to your profile.
          You can also continue as a guest, but personal records will not be
          saved.
        </p>
        <div className="mt-4 grid gap-2 sm:grid-cols-3">
          <Button asChild>
            <Link href="/login">
              Sign In
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
          </Button>
          <Button asChild variant="secondary">
            <Link href="/login?mode=sign-up">
              <UserPlus className="h-4 w-4" aria-hidden />
              Sign Up
            </Link>
          </Button>
          <Button type="button" variant="ghost" onClick={continueAsGuest}>
            Continue as Guest
          </Button>
        </div>
      </section>
    </div>
  );
}
