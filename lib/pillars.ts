import type { PillarName } from "@/lib/types";

export type LegacyPillarName = PillarName | "Willing";

export function normalizePillarName(pillar: LegacyPillarName): PillarName {
  return pillar === "Willing" ? "Doing" : pillar;
}

export function displayPillarName(pillar: LegacyPillarName | null | undefined) {
  if (!pillar) return "-";
  return normalizePillarName(pillar);
}
