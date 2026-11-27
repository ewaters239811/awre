"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Mail } from "lucide-react";
import { createSupabaseBrowserClient, isSupabaseConfigured } from "@/lib/supabase/client";

export function WeeklyLetterLink() {
  const [letterCount, setLetterCount] = useState(0);

  useEffect(() => {
    if (!isSupabaseConfigured()) return;
    const client = createSupabaseBrowserClient();
    let active = true;
    let refreshing = false;
    const refresh = async () => {
      if (document.hidden || refreshing) return;
      refreshing = true;
      const { count, error } = await client.from("weekly_letters")
        .select("week_of", { count: "exact", head: true });
      refreshing = false;
      if (active && !error && count !== null) setLetterCount(count);
    };
    void refresh();
    const timer = window.setInterval(refresh, 60_000);
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      active = false;
      window.clearInterval(timer);
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, []);

  return (
    <Link
      href="/letters"
      aria-label={letterCount > 0 ? `Weekly letters, ${letterCount} in inbox` : undefined}
      className="mt-6 flex items-center gap-3 rounded-xl border border-border/65 bg-card/45 px-4 py-3 transition hover:border-primary/45 hover:bg-card/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
        <Mail className="h-5 w-5" aria-hidden />
      </span>
      <span className="min-w-0 flex-1 font-medium">Weekly letters</span>
      {letterCount > 0 && (
        <span
          aria-hidden
          className="inline-flex h-7 min-w-7 shrink-0 items-center justify-center rounded-full bg-achievement/15 px-2 text-sm font-semibold tabular-nums text-achievement"
        >
          {letterCount}
        </span>
      )}
    </Link>
  );
}
