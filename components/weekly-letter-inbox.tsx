"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { ChevronDown } from "lucide-react";
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

  const markRead = useCallback(async (letter: WeeklyLetter) => {
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
      setNotice("Your read status couldn’t be saved.");
    }
  }, []);

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
        if (page.letters[0]) void markRead(page.letters[0]);
      } catch {
        if (active) setStatus("error");
      }
    };
    void initialize();
    return () => { active = false; };
  }, [attempt, markRead]);

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
  const [latestLetter, ...pastLetters] = letters;
  if (!latestLetter) return <p className="mt-9 text-base text-muted-foreground">No letters</p>;

  return (
    <section aria-label="Your letters" className="mt-8 sm:mt-10">
      <article>
        <header className="mb-6">
          <LetterDate letter={latestLetter} />
          <h2 className="mt-2 break-words font-serif text-2xl leading-snug text-foreground sm:text-3xl">
            {latestLetter.subject}
          </h2>
        </header>
        <LetterText paragraphs={latestLetter.paragraphs} />
      </article>
      {(pastLetters.length > 0 || hasMore) && (
        <details className="group/archive mt-10 border-t border-border/40 pt-3">
          <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 rounded-md py-1 font-medium text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring [&::-webkit-details-marker]:hidden">
            Past letters
            <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-open/archive:rotate-180 motion-reduce:transition-none" aria-hidden />
          </summary>
          <div className="mt-2 space-y-3">
            {pastLetters.map((letter) => (
              <WeeklyLetterCard key={letter.week_of} letter={letter} onOpen={() => void markRead(letter)} />
            ))}
            {hasMore && (
              <Button variant="secondary" disabled={loadingOlder} onClick={() => void loadOlder()}>
                {loadingOlder ? "Loading older letters…" : "Load older letters"}
              </Button>
            )}
          </div>
        </details>
      )}
      {notice && <p role="status" className="mt-4 text-muted-foreground">{notice}</p>}
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
      className="group/letter overflow-hidden rounded-xl border border-border/55 bg-card/40 open:border-primary/30"
      onToggle={(event) => { if (event.currentTarget.open) onOpen(); }}
    >
      <summary className="flex min-h-20 cursor-pointer list-none items-center gap-3 p-4 transition hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring sm:px-6 [&::-webkit-details-marker]:hidden">
        <span className="min-w-0 flex-1">
          <LetterDate letter={letter} />
          <span className="mt-1 block break-words font-serif text-xl leading-snug text-foreground">{letter.subject}</span>
        </span>
        <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-open/letter:rotate-180 motion-reduce:transition-none" aria-hidden />
      </summary>
      <article className="border-t border-border/40 px-4 py-6 sm:px-6">
        <LetterText paragraphs={letter.paragraphs} />
      </article>
    </details>
  );
}

function LetterDate({ letter }: { letter: WeeklyLetter }) {
  return (
    <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
      <time dateTime={letter.week_of} className="text-sm text-muted-foreground">
        {weekFormat.format(new Date(`${letter.week_of}T12:00:00Z`))}
      </time>
      {!letter.read_at && <span className="text-sm font-medium text-achievement">Unread</span>}
    </span>
  );
}

function LetterText({ paragraphs }: { paragraphs: WeeklyLetter["paragraphs"] }) {
  return (
    <div className="max-w-[58ch] space-y-6 font-serif text-lg leading-[1.8] text-foreground">
      <p className="text-primary">Dear me,</p>
      {paragraphs.map((paragraph, index) => (
        <p key={index} className="whitespace-pre-line break-words">{paragraph}</p>
      ))}
      <p className="text-primary">With care,<br />Me</p>
    </div>
  );
}
