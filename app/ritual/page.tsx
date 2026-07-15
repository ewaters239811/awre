"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { Mic, MicOff, Save } from "lucide-react";
import { DailyFlow } from "@/components/daily-flow";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { getCurrentAccount, saveJournalEntryToAccount } from "@/lib/account-data";
import { getCheckInForDate } from "@/lib/alignment";
import {
  createEmptyJournalEntry,
  getJournalEntries,
  getJournalEntryForDate,
  saveJournalEntry,
} from "@/lib/journal-storage";
import { useCurrentCheckInDateKey } from "@/lib/use-current-check-in-date-key";
import { useCurrentDateKey } from "@/lib/use-current-date-key";
import type { JournalEntry } from "@/lib/types";

type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;

type SpeechRecognitionLike = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
};

type SpeechRecognitionEventLike = {
  results: ArrayLike<{
    0: {
      transcript: string;
    };
    isFinal: boolean;
  }>;
};

type SpeechWindow = Window & {
  SpeechRecognition?: SpeechRecognitionConstructor;
  webkitSpeechRecognition?: SpeechRecognitionConstructor;
};

export default function RitualPage() {
  const today = useCurrentDateKey();
  const checkInToday = useCurrentCheckInDateKey();
  const [entry, setEntry] = useState<JournalEntry | null>(null);
  const [draftContent, setDraftContent] = useState("");
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [saved, setSaved] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);
  const [error, setError] = useState("");
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const speechBaseRef = useRef("");

  useEffect(() => {
    queueMicrotask(() => {
      setEntry(getJournalEntryForDate(today) ?? createEmptyJournalEntry(today));
      setDraftContent("");
      setEntries(getJournalEntries());
      const speechWindow = window as SpeechWindow;
      setSpeechSupported(
        Boolean(
          speechWindow.SpeechRecognition ||
            speechWindow.webkitSpeechRecognition,
        ),
      );
    });
  }, [today]);

  const updateContent = (content: string) => {
    setSaved(false);
    setError("");
    setDraftContent(content);
  };

  const saveEntry = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const content = draftContent.trim();
    if (!entry || !content) return;

    const account = await getCurrentAccount();
    if (!account) {
      setError("Sign in or create an account to save your journal.");
      return;
    }

    const existingEntry = getJournalEntryForDate(today);
    const nextEntry: JournalEntry = {
      ...(existingEntry ?? entry),
      date: today,
      content: existingEntry?.content.trim()
        ? `${existingEntry.content.trim()}\n\n${content}`
        : content,
      updatedAt: new Date().toISOString(),
    };

    await saveJournalEntryToAccount(nextEntry);
    saveJournalEntry(nextEntry);
    setEntry(nextEntry);
    setDraftContent("");
    setEntries(getJournalEntries());
    setSaved(true);
  };

  const toggleSpeech = () => {
    if (!entry || !speechSupported) return;

    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }

    const speechWindow = window as SpeechWindow;
    const Recognition =
      speechWindow.SpeechRecognition || speechWindow.webkitSpeechRecognition;

    if (!Recognition) return;

    const recognition = new Recognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";
    speechBaseRef.current = draftContent.trim();
    recognition.onresult = (event) => {
      let transcript = "";

      for (let index = 0; index < event.results.length; index += 1) {
        transcript += event.results[index][0].transcript;
      }

      setDraftContent(`${speechBaseRef.current} ${transcript}`.trim());
      setSaved(false);
    };
    recognition.onend = () => setIsListening(false);
    recognitionRef.current = recognition;
    recognition.start();
    setIsListening(true);
  };

  if (!entry) {
    return <main className="container py-12">Loading journal...</main>;
  }

  const savedTodayEntry = entries.find(
    (item) => item.date === today && item.content.trim(),
  );
  const recentEntries = entries
    .filter((item) => item.id !== savedTodayEntry?.id)
    .slice(0, 4);
  const checkedInToday = Boolean(getCheckInForDate(checkInToday));
  const wordCount = draftContent.trim()
    ? draftContent.trim().split(/\s+/).length
    : 0;

  return (
    <main className="container py-6 md:py-12">
      <section className="mx-auto max-w-6xl">
        <p className="clearpth-page-kicker">Journal</p>
        <h1 className="clearpth-page-title">Write It Out</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground md:mt-4 md:text-base">
          One honest entry is enough. Name what the day revealed about the gap.
        </p>
        <div className="mt-5 md:mt-6">
          <DailyFlow
            checkedIn={checkedInToday}
            readToday={checkedInToday}
            journaled={Boolean(savedTodayEntry || draftContent.trim())}
          />
        </div>
      </section>

      <section className="mx-auto mt-6 grid max-w-6xl gap-5 lg:mt-8 lg:grid-cols-[1fr_320px]">
        <form
          className="aura-glass rounded-2xl p-4 md:rounded-lg md:p-6"
          onSubmit={saveEntry}
        >
          <div className="flex flex-col gap-4 border-b border-border/60 pb-4 sm:flex-row sm:items-center sm:justify-between md:pb-5">
            <div>
              <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground md:text-xs md:tracking-[0.24em]">
                {entry.date}
              </p>
              <h2 className="mt-1 font-serif text-2xl font-semibold md:mt-2">
                Today&apos;s Entry
              </h2>
            </div>
            <Button
              type="button"
              variant="secondary"
              onClick={toggleSpeech}
              disabled={!speechSupported}
              title={
                speechSupported
                  ? "Speak journal entry"
                  : "Speech input is not supported in this browser"
              }
            >
              {isListening ? (
                <MicOff className="h-4 w-4" aria-hidden />
              ) : (
                <Mic className="h-4 w-4" aria-hidden />
              )}
              {isListening ? "Stop" : "Speak"}
            </Button>
          </div>

          <Textarea
            className="mt-5 min-h-[300px] rounded-2xl text-[16px] leading-7 md:min-h-[360px] md:rounded-md"
            value={draftContent}
            onChange={(event) => updateContent(event.target.value)}
            placeholder="What did today reveal about the gap?"
          />

          <div className="mt-4 flex flex-col gap-3 sm:mt-5 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-muted-foreground sm:text-sm">
              {wordCount} words recorded for today.
            </p>
            <div className="flex items-center gap-3">
              {saved ? <p className="text-sm text-muted-foreground">Saved.</p> : null}
              {error ? <p className="text-sm text-primary">{error}</p> : null}
              <Button type="submit" disabled={!draftContent.trim()}>
                <Save className="h-4 w-4" aria-hidden />
                Save Journal
              </Button>
            </div>
          </div>
        </form>

        <aside className="rounded-2xl border border-border/65 bg-card/35 p-4 md:aura-glass md:rounded-lg md:p-5">
          <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground md:text-xs md:tracking-[0.24em]">
            Journal Signal
          </p>
          <div className="mt-5 grid gap-3">
            <JournalStat label="Saved entries" value={String(entries.length)} />
            <JournalStat
              label="Today"
              value={savedTodayEntry ? "Saved" : draftContent.trim() ? "Open" : "Blank"}
            />
            <JournalStat label="Voice input" value={speechSupported ? "Ready" : "Unavailable"} />
          </div>

          {savedTodayEntry ? (
            <div className="mt-6 border-t border-border/60 pt-5">
              <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">
                Saved Today
              </p>
              <article className="mt-4 rounded-md border border-border/70 bg-card p-3">
                <p className="line-clamp-4 text-sm leading-6">
                  {savedTodayEntry.content}
                </p>
              </article>
            </div>
          ) : null}

          <div className="mt-6 border-t border-border/60 pt-5">
            <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground md:text-xs md:tracking-[0.24em]">
              Recent Entries
            </p>
            <div className="mt-4 grid gap-3">
              {recentEntries.length > 0 ? (
                recentEntries.map((item) => (
                  <article
                    key={item.id}
                    className="rounded-md border border-border/70 bg-card p-3"
                  >
                    <p className="text-xs text-muted-foreground">{item.date}</p>
                    <p className="mt-2 line-clamp-3 text-sm leading-6">
                      {item.content}
                    </p>
                  </article>
                ))
              ) : (
                <p className="text-sm leading-6 text-muted-foreground">
                  Your saved journal entries will appear here after today.
                </p>
              )}
            </div>
          </div>
        </aside>
      </section>
    </main>
  );
}

function JournalStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between rounded-md border border-border/70 bg-card px-4 py-3">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-medium">{value}</span>
    </div>
  );
}
