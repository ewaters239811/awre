import type { PillarName } from "@/lib/types";

export type LegacyPillarName = PillarName | "Willing" | "Acting";

export function normalizePillarName(pillar: LegacyPillarName): PillarName {
  return pillar === "Willing" || pillar === "Acting" ? "Doing" : pillar;
}

export function displayPillarName(pillar: LegacyPillarName | null | undefined) {
  if (!pillar) return "-";
  return normalizePillarName(pillar) === "Doing" ? "Acting" : pillar;
}
