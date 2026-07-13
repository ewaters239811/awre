"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { Mic, MicOff, Save } from "lucide-react";
import { DailyFlow } from "@/components/daily-flow";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { getCurrentAccount, saveJournalEntryToAccount } from "@/lib/account-data";
import { getTodaysCheckIn } from "@/lib/alignment";
import {
  createEmptyJournalEntry,
  getJournalEntries,
  getJournalEntryForDate,
  saveJournalEntry,
  toDateKey,
} from "@/lib/journal-storage";
import type { JournalEntry } from "@/lib/types";

const today = toDateKey(new Date());

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
  const [entry, setEntry] = useState<JournalEntry | null>(null);
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [saved, setSaved] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);
  const [error, setError] = useState("");
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const speechBaseRef = useRef("");

  useEffect(() => {
    queueMicrotask(() => {
      setEntry(getJournalEntryForDate(today) ?? createEmptyJournalEntry());
      setEntries(getJournalEntries());
      const speechWindow = window as SpeechWindow;
      setSpeechSupported(
        Boolean(
          speechWindow.SpeechRecognition ||
            speechWindow.webkitSpeechRecognition,
        ),
      );
    });
  }, []);

  const updateContent = (content: string) => {
    setSaved(false);
    setError("");
    setEntry((current) => (current ? { ...current, content } : current));
  };

  const saveEntry = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!entry || !entry.content.trim()) return;

    const account = await getCurrentAccount();
    if (!account) {
      setError("Sign in or create an account to save your journal.");
      return;
    }

    await saveJournalEntryToAccount(entry);
    saveJournalEntry(entry);
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
    speechBaseRef.current = entry.content.trim();
    recognition.onresult = (event) => {
      let transcript = "";

      for (let index = 0; index < event.results.length; index += 1) {
        transcript += event.results[index][0].transcript;
      }

      setEntry((current) =>
        current
          ? {
              ...current,
              content: `${speechBaseRef.current} ${transcript}`.trim(),
            }
          : current,
      );
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

  const recentEntries = entries.filter((item) => item.id !== entry.id).slice(0, 4);
  const checkedInToday = Boolean(getTodaysCheckIn());
  const wordCount = entry.content.trim()
    ? entry.content.trim().split(/\s+/).length
    : 0;

  return (
    <main className="container py-8 md:py-12">
      <section className="mx-auto max-w-6xl">
        <p className="clearpth-page-kicker">Daily Journal</p>
        <h1 className="clearpth-page-title">Journal The Pattern Of The Day</h1>
        <p className="mt-4 max-w-3xl text-muted-foreground">
          Write or speak one honest entry. ClearPth uses your saved journal
          history as additional context for wiser guidance and deeper analysis.
        </p>
        <div className="mt-6">
          <DailyFlow
            checkedIn={checkedInToday}
            readToday={checkedInToday}
            journaled={Boolean(entry.content.trim())}
          />
        </div>
      </section>

      <section className="mx-auto mt-8 grid max-w-6xl gap-5 lg:grid-cols-[1fr_320px]">
        <form
          className="aura-glass rounded-lg p-5 md:p-6"
          onSubmit={saveEntry}
        >
          <div className="flex flex-col gap-4 border-b border-border/60 pb-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">
                {entry.date}
              </p>
              <h2 className="mt-2 text-2xl font-semibold">Today&apos;s Entry</h2>
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
            className="mt-5 min-h-[260px] md:min-h-[360px]"
            value={entry.content}
            onChange={(event) => updateContent(event.target.value)}
            placeholder="What happened today? What did it reveal about your thinking, willing, feeling, or identity? Where did you gather power, and where did you leak it?"
          />

          <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-muted-foreground">
              {wordCount} words recorded for today.
            </p>
            <div className="flex items-center gap-3">
              {saved ? <p className="text-sm text-muted-foreground">Saved.</p> : null}
              {error ? <p className="text-sm text-primary">{error}</p> : null}
              <Button type="submit" disabled={!entry.content.trim()}>
                <Save className="h-4 w-4" aria-hidden />
                Save Journal
              </Button>
            </div>
          </div>
        </form>

        <aside className="aura-glass rounded-lg p-5">
          <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">
            Journal Signal
          </p>
          <div className="mt-5 grid gap-3">
            <JournalStat label="Saved entries" value={String(entries.length)} />
            <JournalStat label="Today" value={entry.content.trim() ? "Open" : "Blank"} />
            <JournalStat label="Voice input" value={speechSupported ? "Ready" : "Unavailable"} />
          </div>

          <div className="mt-6 border-t border-border/60 pt-5">
            <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">
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
