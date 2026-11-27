"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ChevronDown, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getCurrentAccount } from "@/lib/account-data";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { WEEKLY_LETTER_COLUMNS, type WeeklyLetter } from "@/lib/weekly-letters";

const PAGE_SIZE = 12;
const weekFormat = new Intl.DateTimeFormat(undefined, {
  month: "long",
  day: "numeric",
  year: "numeric",
  timeZone: "UTC",
});

async function fetchLetters(before?: string) {
  const client = createSupabaseBrowserClient();
  const query = client.from("weekly_letters").select(WEEKLY_LETTER_COLUMNS)
    .order("week_of", { ascending: false }).limit(PAGE_SIZE + 1);
  const { data, error } = await (before ? query.lt("week_of", before) : query);
  if (error) throw error;
  return {
    letters: (data ?? []).slice(0, PAGE_SIZE) as WeeklyLetter[],
    hasMore: (data?.length ?? 0) > PAGE_SIZE,
  };
}
export function WeeklyLetterInbox() {
  const [letters, setLetters] = useState<WeeklyLetter[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [status, setStatus] = useState<"loading" | "guest" | "ready" | "error">("loading");
  const [attempt, setAttempt] = useState(0);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    let active = true;
    const initialize = async () => {
      try {
        const account = await getCurrentAccount();
        if (!account) {
          if (active) setStatus("guest");
          return;
        }
        const page = await fetchLetters();
        if (!active) return;
        setLetters(page.letters);
        setHasMore(page.hasMore);
        setStatus("ready");
      } catch {
        if (active) setStatus("error");
      }
    };
    void initialize();
    return () => { active = false; };
  }, [attempt]);

  async function loadOlder() {
    setLoadingOlder(true);
    setNotice("");
    try {
      const page = await fetchLetters(letters.at(-1)?.week_of);
      setLetters((current) => [...current, ...page.letters]);
      setHasMore(page.hasMore);
    } catch {
      setNotice("Older letters couldn’t be loaded. Try again.");
    } finally {
      setLoadingOlder(false);
    }
  }

  async function markRead(letter: WeeklyLetter) {
    if (letter.read_at) return;
    const readAt = new Date().toISOString();
    try {
      const { error } = await createSupabaseBrowserClient().from("weekly_letters")
        .update({ read_at: readAt }).eq("week_of", letter.week_of).is("read_at", null);
      if (error) throw error;
      setLetters((current) => current.map((item) =>
        item.week_of === letter.week_of ? { ...item, read_at: readAt } : item,
      ));
      setNotice("");
    } catch {
      setNotice("Your read status couldn’t be saved. Reopen the letter to try again.");
    }
  }

  if (status === "loading") return <p className="mt-6 text-muted-foreground" role="status">Loading letters…</p>;
  if (status === "guest") {
    return (
      <div className="mt-6">
        <p className="text-muted-foreground">Sign in to read your private letters.</p>
        <Button asChild className="mt-4"><Link href="/login">Sign in</Link></Button>
      </div>
    );
  }
  if (status === "error") {
    return (
      <div className="mt-6">
        <p role="alert" className="text-muted-foreground">Your letters couldn’t be loaded.</p>
        <Button className="mt-4" onClick={() => { setStatus("loading"); setAttempt((value) => value + 1); }}>
          Try again
        </Button>
      </div>
    );
  }
  if (!letters.length) {
    return (
      <div className="mt-6 rounded-2xl border border-border/65 bg-card/55 p-6">
        <Mail className="mb-4 h-6 w-6 text-primary" aria-hidden />
        <h2 className="font-serif text-2xl">No weekly letters yet</h2>
        <p className="mt-2 leading-7 text-muted-foreground">
          Your weekly letters appear here on Sundays once you’ve chosen an active desired reality.
        </p>
        <Link href="/manifestations" className="mt-4 inline-flex min-h-11 items-center text-primary underline underline-offset-4">
          View my desired reality
        </Link>
      </div>
    );
  }

  return (
    <section aria-label="Your letters" className="mt-6 space-y-4">
      {letters.map((letter) => (
        <WeeklyLetterCard key={letter.week_of} letter={letter} onOpen={() => void markRead(letter)} />
      ))}
      {hasMore && (
        <Button variant="secondary" disabled={loadingOlder} onClick={() => void loadOlder()}>
          {loadingOlder ? "Loading older letters…" : "Load older letters"}
        </Button>
      )}
      {notice && <p role="status" className="text-muted-foreground">{notice}</p>}
    </section>
  );
}
export function WeeklyLetterCard({
  letter,
  onOpen,
}: {
  letter: WeeklyLetter;
  onOpen: () => void;
}) {
  return (
    <details
      className="group overflow-hidden rounded-2xl border border-border/65 bg-card/55 open:border-primary/35"
      onToggle={(event) => { if (event.currentTarget.open) onOpen(); }}
    >
      <summary className="flex min-h-20 cursor-pointer list-none items-center gap-3 p-4 transition hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring sm:px-6 [&::-webkit-details-marker]:hidden">
        <Mail className="h-5 w-5 shrink-0 text-primary" aria-hidden />
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <time dateTime={letter.week_of} className="text-sm text-muted-foreground">
              {weekFormat.format(new Date(`${letter.week_of}T12:00:00Z`))}
            </time>
            {!letter.read_at && <span className="text-sm font-medium text-achievement">Unread</span>}
          </span>
          <span className="mt-1 block break-words font-serif text-xl leading-snug text-foreground">{letter.subject}</span>
        </span>
        <ChevronDown className="h-5 w-5 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" aria-hidden />
      </summary>
      <article className="space-y-5 border-t border-border/60 px-5 py-6 font-serif text-lg leading-relaxed text-foreground sm:px-8 sm:py-8">
        <p className="text-primary">Dear me,</p>
        {letter.paragraphs.map((paragraph, index) => (
          <p key={index} className="whitespace-pre-line break-words">{paragraph}</p>
        ))}
        <p className="text-primary">With care,<br />Me</p>
      </article>
    </details>
  );
}
