import { displayPillarName } from "@/lib/pillars";
import type { CheckInResult } from "@/lib/types";

export function getTodayReading(result: CheckInResult) {
  const saved = result.aiAlignment;
  const summary =
    typeof saved?.summary === "string" ? saved.summary.trim() : "";
  if (!summary) return null;
  const dailyGap =
    typeof saved?.dailyGap === "string" ? saved.dailyGap.trim() : "";
  if (dailyGap) return { gap: dailyGap, summary };

  // Older saved readings keep their original analysis; no new request is needed for the layout.
  const scores = [
    result.thinkingScore,
    result.willingScore,
    result.feelingScore,
  ];
  const spread = Math.max(...scores) - Math.min(...scores);
  const gap =
    Math.min(...scores) >= 8
      ? "Your ratings show strong inner alignment today."
      : spread === 0
        ? "No single area stands apart in today's ratings."
        : `Your ratings point to ${displayPillarName(result.weakestPillar).toLowerCase()} as a focus today.`;
  return { gap, summary };
}
