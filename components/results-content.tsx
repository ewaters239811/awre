"use client";

import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { AlignmentResult } from "@/components/alignment-result";
import { Button } from "@/components/ui/button";
import { saveCheckInToAccount } from "@/lib/account-data";
import { buildAiReadingSignature } from "@/lib/ai-reading-signature";
import {
  getCheckInById,
  getLatestCheckIn,
  updateCheckIn,
} from "@/lib/alignment";
import { getJournalEntries } from "@/lib/journal-storage";
import { getOnboardingProfile } from "@/lib/onboarding-storage";
import type { CheckInResult } from "@/lib/types";

type AiStatus = "idle" | "loading" | "ready" | "unavailable";

export function ResultsContent() {
  const searchParams = useSearchParams();
  const [result, setResult] = useState<CheckInResult | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [aiStatus, setAiStatus] = useState<AiStatus>("idle");
  const requestedAiFor = useRef<string | null>(null);

  useEffect(() => {
    queueMicrotask(() => {
      const id = searchParams.get("id");
      const savedResult = id ? getCheckInById(id) : getLatestCheckIn();
      setResult(savedResult);
      setAiStatus(savedResult?.aiAlignment ? "ready" : "loading");
      setLoaded(true);
    });
  }, [searchParams]);

  useEffect(() => {
    if (!result) {
      return;
    }

    const onboardingProfile = getOnboardingProfile();
    const recentJournalEntries = getJournalEntries().slice(0, 8);
    const contextSignature = buildAiReadingSignature({
      result,
      onboardingProfile,
      journalEntries: recentJournalEntries,
    });
    const shouldGenerate =
      !result.aiAlignment ||
      Boolean(
        result.aiContextSignature &&
          result.aiContextSignature !== contextSignature,
      );
    const requestKey = `${result.id}:${contextSignature}`;

    if (!shouldGenerate || requestedAiFor.current === requestKey) {
      setAiStatus(result.aiAlignment ? "ready" : "unavailable");
      return;
    }

    requestedAiFor.current = requestKey;
    setAiStatus("loading");

    fetch("/api/personalize", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        result,
        onboardingProfile,
        recentJournalEntries: recentJournalEntries.map((entry) => ({
          date: entry.date,
          content: entry.content,
        })),
      }),
    })
      .then((response) => response.json())
      .then(
        (payload: {
          enabled?: boolean;
          data?: CheckInResult["aiAlignment"];
        }) => {
          if (!payload.enabled || !payload.data) {
            setAiStatus("unavailable");
            return;
          }

          const updated: CheckInResult = {
            ...result,
            aiAlignment: payload.data,
            aiGeneratedAt: new Date().toISOString(),
            aiContextSignature: contextSignature,
          };
          saveCheckInToAccount(updated)
            .then(() => updateCheckIn(updated))
            .catch(() => undefined);
          setResult(updated);
          setAiStatus("ready");
        },
      )
      .catch(() => setAiStatus("unavailable"));
  }, [result]);

  if (!loaded) {
    return <main className="container py-12">Loading alignment...</main>;
  }

  if (!result) {
    return <NoResultFound />;
  }

  return (
    <main className="container py-8 md:py-12">
      <AlignmentResult result={result} aiStatus={aiStatus} />
    </main>
  );
}

function NoResultFound() {
  return (
    <main className="container py-12">
      <div className="aura-glass mx-auto max-w-2xl rounded-lg p-6">
        <h1 className="font-serif text-4xl font-semibold">No Result Found</h1>
        <p className="mt-3 text-muted-foreground">
          Complete a check-in first and your alignment result will appear here.
        </p>
        <Button asChild className="mt-6">
          <Link href="/check-in">Begin Check In</Link>
        </Button>
      </div>
    </main>
  );
}
