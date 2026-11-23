import { test } from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createLoader, browserStorage } from "./load-module.mjs";

test("Settings journal history is closed and does not render or alter saved entries until opened", () => {
  const storage = browserStorage();
  const load = createLoader();
  try {
    const journals = load("lib/journal-storage.ts");
    journals.saveJournalEntry({
      id: "older",
      manifestationId: "goal-one",
      date: "2026-11-20",
      content: "PRIVATE_PAST_ENTRY",
      createdAt: "then",
      updatedAt: "then",
    });
    const before = journals.getAllJournalEntries();
    const { JournalHistory } = load("components/journal-history.tsx");
    const markup = renderToStaticMarkup(React.createElement(JournalHistory));
    assert.ok(markup.includes("Journal history"));
    assert.ok(!markup.includes(" open="));
    assert.ok(!markup.includes("PRIVATE_PAST_ENTRY"));
    assert.deepEqual(journals.getAllJournalEntries(), before);
  } finally {
    storage.cleanup();
  }
});
