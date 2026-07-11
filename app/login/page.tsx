"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { syncLocalDataToAccount } from "@/lib/account-data";
import { createSupabaseBrowserClient, isSupabaseConfigured } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"sign-in" | "sign-up">("sign-in");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

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
        setStatus(
          "Account created. Check your email and click the Supabase confirmation link before signing in.",
        );
        setMode("sign-in");
        setPassword("");
        return;
      }

      await syncLocalDataToAccount();
      setStatus(
        mode === "sign-up"
          ? "Account created and signed in. Your local data is syncing to your profile."
          : "Signed in. Your local data is syncing to your profile.",
      );
      router.push("/account");
    } catch {
      setError("Something went wrong while connecting your account.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="container py-8 md:py-12">
      <section className="mx-auto grid max-w-5xl gap-6 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
        <div>
          <p className="clearpth-page-kicker">Account</p>
          <h1 className="clearpth-page-title">Save Your Path</h1>
          <p className="mt-4 max-w-xl leading-7 text-muted-foreground">
            Create a ClearPth account so your check-ins, journal entries,
            onboarding profile, and analysis can follow you across devices.
          </p>
          <div className="mt-6 rounded-md border border-border/70 bg-card/35 p-4">
            <div className="flex items-start gap-3">
              <ShieldCheck className="mt-1 h-5 w-5 text-primary" aria-hidden />
              <p className="text-sm leading-6 text-muted-foreground">
                Your browser data remains available locally. When you sign in,
                ClearPth copies it into your Supabase profile.
              </p>
            </div>
          </div>
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

          <Button asChild variant="secondary" className="mt-3 w-full">
            <Link href="/">Return Home</Link>
          </Button>
        </form>
      </section>
    </main>
  );
}
