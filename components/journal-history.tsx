"use client";

import { useEffect, useState } from "react";
import {
  getAllJournalEntries,
  JOURNAL_CHANGED_EVENT,
} from "@/lib/journal-storage";
import type { JournalEntry } from "@/lib/types";

export function JournalHistory() {
  const [open, setOpen] = useState(false);
  const [entries, setEntries] = useState<JournalEntry[]>([]);

  useEffect(() => {
    if (!open) return;
    const refresh = () =>
      setEntries(
        getAllJournalEntries()
          .filter((entry) => entry.content.trim())
          .sort(
            (a, b) => b.date.localeCompare(a.date) || a.id.localeCompare(b.id),
          ),
      );
    queueMicrotask(refresh);
    window.addEventListener(JOURNAL_CHANGED_EVENT, refresh);
    return () => window.removeEventListener(JOURNAL_CHANGED_EVENT, refresh);
  }, [open]);

  return (
    <details
      id="journal-history"
      className="mt-5 border-t border-border/45 pt-2"
      onToggle={(event) => setOpen(event.currentTarget.open)}
    >
      <summary className="cursor-pointer py-3 text-sm text-foreground">
        Journal history
      </summary>
      {open ? (
        <div className="divide-y divide-border/40">
          {entries.length ? (
            entries.map((entry) => (
              <details key={entry.id} className="group py-4">
                <summary className="cursor-pointer text-sm text-muted-foreground">
                  <time
                    dateTime={entry.date}
                    className="font-medium text-foreground/90"
                  >
                    {entry.date}
                  </time>
                  <span className="mt-2 block break-words text-sm leading-6 group-open:hidden">
                    {entry.content.replace(/\s+/g, " ").trim().slice(0, 120)}
                    {entry.content.trim().length > 120 ? "..." : ""}
                  </span>
                </summary>
                <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-7 text-foreground/85">
                  {entry.content}
                </p>
              </details>
            ))
          ) : (
            <p className="py-4 text-sm leading-6 text-muted-foreground">
              No journal entries yet.
            </p>
          )}
        </div>
      ) : null}
    </details>
  );
}
