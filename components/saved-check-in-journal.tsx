"use client";

import Link from "next/link";
import { FormEvent, useEffect, useRef, useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { JournalInput } from "@/components/journal-input";
import { getCheckInById } from "@/lib/alignment";
import {
  createJournalReflection,
  saveCheckInSession,
  type CheckInSession,
} from "@/lib/check-in-session";
import {
  getJournalEntries,
  getJournalEntryForDate,
  JOURNAL_CHANGED_EVENT,
} from "@/lib/journal-storage";
import { useCurrentDateKey } from "@/lib/use-current-date-key";
import type { CheckInResult, JournalEntry } from "@/lib/types";

export function SavedCheckInJournal({ result }: { result: CheckInResult }) {
  const today = useCurrentDateKey();
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [editing, setEditing] = useState(!result.checkInJournal);
  const [content, setContent] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const submitting = useRef(false);
  const pending = useRef<{ key: string; session: CheckInSession } | null>(null);
  useEffect(() => {
    const refresh = () => setEntries(getJournalEntries(result.manifestationId));
    queueMicrotask(refresh);
    window.addEventListener(JOURNAL_CHANGED_EVENT, refresh);
    return () => window.removeEventListener(JOURNAL_CHANGED_EVENT, refresh);
  }, [result.manifestationId]);
  const linked = entries.find((entry) => entry.id === result.journalEntryId);
  const current = entries.find((entry) => entry.date === today) ?? linked;
  const writing = current?.content.trim() || result.checkInJournal;
  const save = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submitting.current || !content.trim() || !result.manifestationId)
      return;
    setError("");
    setSaved(false);
    if (
      /\b(suicide|self[-\s]?harm|kill myself|end my life|can't go on|severe depression|crisis)\b/i.test(
        content,
      )
    ) {
      setError(
        "ClearPth is a self-reflection tool, not crisis support. If you may hurt yourself or feel in immediate danger, please call emergency services now or contact a trusted person.",
      );
      return;
    }
    submitting.current = true;
    setSaving(true);
    try {
      const key = JSON.stringify([result.id, today, content.trim()]);
      if (pending.current?.key !== key) {
        const journal = createJournalReflection({
          content,
          goalId: result.manifestationId,
          journalDate: today,
          existingJournal: getJournalEntryForDate(
            today,
            result.manifestationId,
          ),
        });
        const latest = getCheckInById(result.id) ?? result;
        pending.current = {
          key,
          session: {
            journal,
            result: {
              ...latest,
              checkInJournal: latest.checkInJournal || content.trim(),
              journalEntryId: latest.journalEntryId ?? journal.id,
            },
          },
        };
      }
      await saveCheckInSession(pending.current.session);
      pending.current = null;
      setContent("");
      setEditing(false);
      setSaved(true);
    } catch {
      setError(
        "Your reflection couldn't be saved. Your writing is still here; please try again.",
      );
    } finally {
      submitting.current = false;
      setSaving(false);
    }
  };
  return (
    <div className="space-y-6">
      {!editing ? (
        <section
          id="journal"
          className="scroll-mt-24 border-t border-border/45 pt-7"
          aria-labelledby="saved-journal-heading"
        >
          <h2
            id="saved-journal-heading"
            className="font-serif text-2xl font-semibold"
          >
            Journal
          </h2>
          {writing ? (
            <p className="mt-4 whitespace-pre-wrap break-words text-sm leading-7 text-muted-foreground">
              {writing}
            </p>
          ) : null}
          <Button
            type="button"
            variant="ghost"
            className="mt-4"
            onClick={() => setEditing(true)}
          >
            <Plus className="h-4 w-4" aria-hidden />
            Add a reflection
          </Button>
        </section>
      ) : (
        <form onSubmit={save}>
          <JournalInput
            value={content}
            onChange={setContent}
            disabled={saving}
            label={writing ? "Add a reflection" : "Journal"}
          />
          <div className="mt-5 flex flex-wrap gap-3">
            <Button type="submit" disabled={saving || !content.trim()}>
              {saving ? "Saving..." : "Save Reflection"}
            </Button>
            {writing ? (
              <Button
                type="button"
                variant="ghost"
                disabled={saving}
                onClick={() => setEditing(false)}
              >
                Cancel
              </Button>
            ) : null}
          </div>
        </form>
      )}
      {error ? (
        <p role="alert" className="text-sm leading-6 text-primary">
          {error}
        </p>
      ) : null}
      {saved ? (
        <p role="status" className="text-sm text-muted-foreground">
          Saved.{" "}
          <Link
            href="/review"
            className="text-primary underline underline-offset-4"
          >
            Read your updated result
          </Link>
        </p>
      ) : null}
    </div>
  );
}
