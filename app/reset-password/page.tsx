"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  createSupabaseBrowserClient,
  isSupabaseConfigured,
} from "@/lib/supabase/client";

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [hasSession, setHasSession] = useState(false);
  const [complete, setComplete] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    queueMicrotask(async () => {
      if (!isSupabaseConfigured()) {
        setCheckingSession(false);
        return;
      }

      try {
        const supabase = createSupabaseBrowserClient();
        const { data } = await supabase.auth.getSession();
        setHasSession(Boolean(data.session));
      } catch {
        setHasSession(false);
      } finally {
        setCheckingSession(false);
      }
    });
  }, []);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");

    if (password.length < 6) {
      setError("Use a password with at least 6 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setError("The passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      const supabase = createSupabaseBrowserClient();
      const { error: updateError } = await supabase.auth.updateUser({
        password,
      });

      if (updateError) {
        setError(updateError.message);
        return;
      }

      setComplete(true);
      setPassword("");
      setConfirmPassword("");
    } catch {
      setError("Could not update your password. Please request a new link.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="container flex min-h-[calc(100dvh-9rem)] items-center py-8 md:min-h-[calc(100vh-5rem)] md:py-12">
      <section className="aura-glass mx-auto w-full max-w-xl rounded-lg p-6 md:p-8">
        <p className="clearpth-page-kicker">Password Reset</p>
        <h1 className="mt-3 font-serif text-4xl font-semibold leading-tight">
          Create a new password.
        </h1>

        {checkingSession ? (
          <p className="mt-4 leading-7 text-muted-foreground">
            Confirming your reset link...
          </p>
        ) : complete ? (
          <div className="mt-6 rounded-md border border-primary/25 bg-primary/10 p-4">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="mt-1 h-5 w-5 shrink-0 text-primary" />
              <div>
                <p className="font-medium text-foreground">
                  Your password has been updated.
                </p>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  You can continue into ClearPth with your new password.
                </p>
              </div>
            </div>
            <Button asChild className="mt-5 w-full">
              <Link href="/">
                Continue
                <ArrowRight className="h-4 w-4" aria-hidden />
              </Link>
            </Button>
          </div>
        ) : !hasSession ? (
          <div className="mt-5">
            <p className="leading-7 text-muted-foreground">
              This reset link is missing, expired, or already used. Request a
              new password reset link and open it on this device.
            </p>
            <Button asChild className="mt-6 w-full" variant="secondary">
              <Link href="/login">Return To Sign In</Link>
            </Button>
          </div>
        ) : (
          <form className="mt-6" onSubmit={submit}>
            <p className="leading-7 text-muted-foreground">
              Enter a new password for your ClearPth account.
            </p>

            <label className="mt-5 block text-sm font-medium">
              New Password
              <input
                className="mt-2 h-12 w-full rounded-md border border-input bg-card px-4 text-base outline-none transition focus:ring-2 focus:ring-ring md:text-sm"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="new-password"
                required
              />
            </label>

            <label className="mt-4 block text-sm font-medium">
              Confirm Password
              <input
                className="mt-2 h-12 w-full rounded-md border border-input bg-card px-4 text-base outline-none transition focus:ring-2 focus:ring-ring md:text-sm"
                type="password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                autoComplete="new-password"
                required
              />
            </label>

            {error ? <p className="mt-4 text-sm text-primary">{error}</p> : null}

            <Button type="submit" className="mt-6 w-full" disabled={loading}>
              {loading ? "Updating..." : "Update Password"}
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Button>
          </form>
        )}
      </section>
    </main>
  );
}
