"use client";

import { useEffect, useState } from "react";
import { saveCheckInToAccount } from "@/lib/account-data";
import { getTodaysCheckIn, updateCheckIn } from "@/lib/alignment";
import type { CheckInResult } from "@/lib/types";
import { useManifestations } from "@/lib/use-manifestations";
import { markTodayRead } from "@/lib/daily-path";
import { Button } from "@/components/ui/button";
import { useCurrentCheckInDateKey } from "@/lib/use-current-check-in-date-key";

const localQuotes = [
  "A magnetic life begins where the mind stops scattering the will.",
  "Your Being becomes radiant when feeling learns to serve chosen truth.",
  "Order the inner current, and the outer world begins to recognize you differently.",
  "The most powerful state is not intensity; it is agreement within the self.",
];

export function TeachingQuote() {
  const { primary } = useManifestations();
  const today = useCurrentCheckInDateKey();
  const [canRead, setCanRead] = useState(false);
  const [read, setRead] = useState(false);
  const [error, setError] = useState("");
  const [quote, setQuote] = useState(localQuotes[0]);
  const [status, setStatus] = useState<"loading" | "ready" | "local">(
    "loading",
  );

  useEffect(() => {
    const latest = getTodaysCheckIn();
    queueMicrotask(() => setCanRead(Boolean(latest)));
    const fallback = getRandomLocalQuote(latest);
    queueMicrotask(() => setQuote(latest?.aiQuote ?? fallback));
    queueMicrotask(() => setRead(Boolean(latest?.readAt)));
    if (latest?.aiQuote) {
      queueMicrotask(() => setStatus("ready"));
      return;
    }

    const controller = new AbortController();

    fetch("/api/teaching-quote", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(latest),
      signal: controller.signal,
    })
      .then((response) => response.json())
      .then(
        (payload: {
          enabled?: boolean;
          data?: {
            quote?: string;
          };
        }) => {
          const aiQuote = payload.data?.quote?.trim();
          if (!payload.enabled || !aiQuote) {
            setStatus("local");
            return;
          }

          setQuote(aiQuote);
          setStatus("ready");

          if (latest) {
            const updated: CheckInResult = {
              ...latest,
              aiQuote,
              aiGeneratedAt: new Date().toISOString(),
            };
            saveCheckInToAccount(updated)
              .then(() => updateCheckIn(updated))
              .catch(() => undefined);
          }
        },
      )
      .catch(() => setStatus("local"));

    return () => controller.abort();
  }, [primary?.id, today]);

  return (
    <section className="aura-glass mx-auto mt-8 max-w-4xl rounded-lg p-7 text-center md:p-12">
      <p className="text-xs uppercase tracking-[0.24em] text-primary">
        Teaching
      </p>
      <div className="aura-luxury-line mx-auto mt-5 max-w-xs" />
      <blockquote className="mt-6 font-serif text-3xl font-semibold leading-10 text-foreground md:text-5xl md:leading-[1.08]">
        &ldquo;{quote}&rdquo;
      </blockquote>
      <p className="mt-4 text-sm text-muted-foreground">
        {status === "loading"
          ? "Drawing from your latest alignment..."
          : "Based on your latest check-in."}
      </p>
      <Button className="mt-5" variant="secondary" disabled={read || !canRead || status === "loading"} onClick={async () => { try { await markTodayRead(); setRead(true); } catch { setError("Could not save. Please try again."); } }}>{read ? "Read today" : "I've read this"}</Button>
      {error ? <p role="alert" className="mt-3 text-sm text-primary">{error}</p> : null}
    </section>
  );
}

function getRandomLocalQuote(latest: CheckInResult | null) {
  if (!latest) {
    return localQuotes[Math.floor(Math.random() * localQuotes.length)];
  }

  const seed =
    latest.thinkingScore + latest.willingScore * 2 + latest.feelingScore * 3;
  return localQuotes[seed % localQuotes.length];
}
