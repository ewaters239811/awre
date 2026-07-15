"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { syncLocalDataToAccount } from "@/lib/account-data";
import { createSupabaseBrowserClient, isSupabaseConfigured } from "@/lib/supabase/client";

const CONFIRMATION_REDIRECT_URL = "https://clearpth.io/auth/callback";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"sign-in" | "sign-up">(() =>
    typeof window !== "undefined" &&
    window.location.search.includes("mode=sign-up")
      ? "sign-up"
      : "sign-in",
  );
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [confirmationEmail, setConfirmationEmail] = useState("");

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setStatus("");

    if (!isSupabaseConfigured()) {
      setError("Supabase is not configured yet.");
      return;
    }

    if (password.length < 6) {
      setError("Use a password with at least 6 characters.");
      return;
    }

    if (mode === "sign-up" && !name.trim()) {
      setError("Enter your name to create an account.");
      return;
    }

    setLoading(true);

    try {
      const supabase = createSupabaseBrowserClient();
      const response =
        mode === "sign-in"
          ? await supabase.auth.signInWithPassword({ email, password })
          : await supabase.auth.signUp({
              email,
              password,
              options: {
                emailRedirectTo: CONFIRMATION_REDIRECT_URL,
                data: {
                  full_name: name.trim(),
                },
              },
            });

      if (response.error) {
        setError(response.error.message);
        return;
      }

      if (mode === "sign-up" && !response.data.session) {
        setConfirmationEmail(email.trim());
        setMode("sign-in");
        setPassword("");
        return;
      }

      const syncResult = await syncLocalDataToAccount();
      setStatus(
        mode === "sign-up"
          ? "Account created and signed in. Your record is connected to your profile."
          : "Signed in. Your record is connected to your profile.",
      );
      router.push(syncResult?.hasOnboardingProfile ? "/" : "/onboarding");
    } catch {
      setError("Something went wrong while connecting your account.");
    } finally {
      setLoading(false);
    }
  };

  const resendConfirmation = async () => {
    setError("");
    setStatus("");

    if (!isSupabaseConfigured()) {
      setError("Supabase is not configured yet.");
      return;
    }

    if (!email.trim()) {
      setError("Enter the email address first.");
      return;
    }

    setResending(true);

    try {
      const supabase = createSupabaseBrowserClient();
      const { error: resendError } = await supabase.auth.resend({
        type: "signup",
        email: email.trim(),
        options: {
          emailRedirectTo: CONFIRMATION_REDIRECT_URL,
        },
      });

      if (resendError) {
        setError(resendError.message);
        return;
      }

      setStatus(
        "Confirmation email sent. Open it on this device and tap the link to return to ClearPth.",
      );
    } catch {
      setError("Could not resend the confirmation email. Please try again.");
    } finally {
      setResending(false);
    }
  };

  const editConfirmationEmail = () => {
    setConfirmationEmail("");
    setStatus("");
    setError("");
    setMode("sign-in");
  };

  if (confirmationEmail) {
    return (
      <main className="container flex min-h-[calc(100dvh-9rem)] items-center py-8 md:min-h-[calc(100vh-5rem)] md:py-12">
        <section className="aura-glass mx-auto max-w-xl rounded-lg p-6 md:p-8">
          <p className="clearpth-page-kicker">Confirm Your Email</p>
          <h1 className="mt-3 font-serif text-4xl font-semibold leading-tight">
            One last step.
          </h1>
          <p className="mt-4 leading-7 text-muted-foreground">
            We sent a confirmation link to {confirmationEmail}. Open that email
            and tap the link to activate your account.
          </p>

          {error ? <p className="mt-4 text-sm text-primary">{error}</p> : null}
          {status ? (
            <p className="mt-4 text-sm leading-6 text-muted-foreground">
              {status}
            </p>
          ) : null}

          <div className="mt-6 grid gap-3">
            <Button
              type="button"
              disabled={resending}
              onClick={resendConfirmation}
            >
              {resending ? "Sending..." : "Resend Confirmation Email"}
            </Button>
            <Button type="button" variant="secondary" onClick={editConfirmationEmail}>
              Change Email Or Sign In
            </Button>
            <Button asChild variant="secondary">
              <Link href="/">Return Home</Link>
            </Button>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="container py-8 md:py-12">
      <section className="mx-auto grid max-w-5xl gap-6 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
        <div>
          <p className="clearpth-page-kicker">Account</p>
          <h1 className="clearpth-page-title">Start Aligning</h1>
        </div>

        <form className="aura-glass rounded-lg p-5 md:p-6" onSubmit={submit}>
          <div className="flex rounded-md border border-border/70 bg-card/35 p-1">
            <button
              type="button"
              className={`flex-1 rounded-md px-3 py-2 text-sm transition ${
                mode === "sign-in"
                  ? "bg-foreground text-background"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              onClick={() => setMode("sign-in")}
            >
              Sign In
            </button>
            <button
              type="button"
              className={`flex-1 rounded-md px-3 py-2 text-sm transition ${
                mode === "sign-up"
                  ? "bg-foreground text-background"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              onClick={() => setMode("sign-up")}
            >
              Create Account
            </button>
          </div>

          {mode === "sign-up" ? (
            <label className="mt-5 block text-sm font-medium">
              Name
              <input
                className="mt-2 h-12 w-full rounded-md border border-input bg-card px-4 text-base outline-none transition focus:ring-2 focus:ring-ring md:text-sm"
                type="text"
                value={name}
                onChange={(event) => setName(event.target.value)}
                autoComplete="name"
                required
              />
            </label>
          ) : null}

          <label className="mt-5 block text-sm font-medium">
            Email
            <input
              className="mt-2 h-12 w-full rounded-md border border-input bg-card px-4 text-base outline-none transition focus:ring-2 focus:ring-ring md:text-sm"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="email"
              required
            />
          </label>

          <label className="mt-4 block text-sm font-medium">
            Password
            <input
              className="mt-2 h-12 w-full rounded-md border border-input bg-card px-4 text-base outline-none transition focus:ring-2 focus:ring-ring md:text-sm"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete={mode === "sign-in" ? "current-password" : "new-password"}
              required
            />
          </label>

          {error ? <p className="mt-4 text-sm text-primary">{error}</p> : null}
          {status ? (
            <p className="mt-4 text-sm leading-6 text-muted-foreground">
              {status}
            </p>
          ) : null}

          <Button type="submit" className="mt-6 w-full" disabled={loading}>
            {loading
              ? "Connecting..."
              : mode === "sign-in"
                ? "Sign In"
                : "Create Account"}
            <ArrowRight className="h-4 w-4" aria-hidden />
          </Button>

          <Button
            type="button"
            variant="secondary"
            className="mt-3 w-full"
            disabled={resending || loading}
            onClick={resendConfirmation}
          >
            {resending ? "Sending..." : "Resend Confirmation Email"}
          </Button>

          <Button asChild variant="secondary" className="mt-3 w-full">
            <Link href="/">Return Home</Link>
          </Button>
        </form>
      </section>
    </main>
  );
}
