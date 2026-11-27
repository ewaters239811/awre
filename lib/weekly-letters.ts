import { goalIdForRecord, primaryManifestation } from "@/lib/manifestations";
import type { CheckInResult, JournalEntry, OnboardingProfile } from "@/lib/types";

export type LetterContent = {
  subject: string;
  paragraphs: [string, string, string];
};

export type WeeklyLetter = {
  week_of: string;
  subject: string;
  paragraphs: string[];
  delivered_at: string;
  read_at: string | null;
};

export type WeeklyLetterWindow = { start: string; endExclusive: string };

export const WEEKLY_LETTER_COLUMNS = "week_of,subject,paragraphs,delivered_at,read_at";
export const WEEKLY_LETTER_RECORD_LIMIT = 7;

export function offsetLetterDate(date: string, days: number) {
  const result = new Date(`${date}T00:00:00Z`);
  result.setUTCDate(result.getUTCDate() + days);
  return result.toISOString().slice(0, 10);
}

export function getWeeklyLetterEdition(now: Date) {
  const day = now.getUTCDay();
  if (day === 1 && now.getUTCHours() < 12) return null;
  const weekOf = offsetLetterDate(now.toISOString().slice(0, 10), -((day + 6) % 7));
  return { weekOf, start: offsetLetterDate(weekOf, -7) };
}

export function getWeeklyLetterPreviewWindow(now: Date, timeZone: string): WeeklyLetterWindow {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone, year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(now);
  const datePart = (type: "year" | "month" | "day") => parts.find((part) => part.type === type)?.value;
  const today = `${datePart("year")}-${datePart("month")}-${datePart("day")}`;
  const day = new Date(`${today}T00:00:00Z`).getUTCDay();
  return { start: offsetLetterDate(today, -((day + 6) % 7)), endExclusive: offsetLetterDate(today, 1) };
}

export function buildWeeklyLetterContext(
  window: WeeklyLetterWindow,
  profile: OnboardingProfile,
  checkIns: CheckInResult[],
  journals: JournalEntry[],
) {
  const goal = primaryManifestation(profile);
  if (!goal?.outcome.trim()) return null;

  const inWeek = (date: string) => date >= window.start && date < window.endExclusive;
  const forGoal = (record: { manifestationId?: string }) =>
    goalIdForRecord(record, profile) === goal.id;
  const goalJournals = journals.filter((entry) => forGoal(entry) && entry.content.trim());
  const goalCheckIns = checkIns.filter(forGoal);
  const goalProgress = goal.developments.map((item) => ({
    ...item,
    date: (item.completedAt ?? item.createdAt).slice(0, 10),
  }));
  const hasWeek = goalJournals.some((entry) => inWeek(entry.date)) ||
    goalCheckIns.some((entry) => inWeek(checkInDay(entry))) ||
    goalProgress.some((item) => inWeek(item.date));
  const useDate = hasWeek ? inWeek : (date: string) => date < window.start;
  const journal = goalJournals.filter((entry) => useDate(entry.date))
    .sort((a, b) => b.date.localeCompare(a.date) || (b.updatedAt ?? "").localeCompare(a.updatedAt ?? ""))
    .slice(0, WEEKLY_LETTER_RECORD_LIMIT);
  const selectedCheckIns = goalCheckIns.filter((entry) => useDate(checkInDay(entry)))
    .sort((a, b) => checkInDay(b).localeCompare(checkInDay(a)) || b.createdAt.localeCompare(a.createdAt))
    .slice(0, WEEKLY_LETTER_RECORD_LIMIT);
  const progress = goalProgress.filter((item) => useDate(item.date))
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, WEEKLY_LETTER_RECORD_LIMIT);
  const hasRecords = Boolean(journal.length || selectedCheckIns.length || progress.length);
  const evidence = hasWeek ? "week" : hasRecords ? "history" : "none";

  return {
    period: { from: window.start, through: offsetLetterDate(window.endExclusive, -1) },
    evidence,
    desiredReality: goal.outcome,
    identity: goal.identity,
    tone: profile.guidanceTone,
    checkIns: selectedCheckIns.map((entry) => {
      const date = checkInDay(entry);
      const snapshot = entry.checkInJournal?.trim() ?? "";
      const alreadyInJournal = snapshot && journal.some((saved) =>
        (saved.id === entry.journalEntryId || saved.date === date) &&
        saved.content.includes(snapshot),
      );
      return {
        date,
        thinking: entry.thinkingScore,
        feeling: entry.feelingScore,
        acting: entry.willingScore,
        reflection: alreadyInJournal
          ? ""
          : excerpt(snapshot || [
              entry.dominantThought,
              entry.currentFeeling,
              entry.avoidedAction,
              entry.highestBeingChoice,
            ].filter(Boolean).join("\n"), 1200),
      };
    }),
    journal: journal.map((entry) => ({
      date: entry.date,
      reflection: excerpt(entry.content, 1600),
    })),
    progress: progress.map((item) => ({
      date: item.date,
      kind: item.kind,
      completed: Boolean(item.completedAt),
      text: excerpt(item.text, 300),
    })),
  };
}

export type WeeklyLetterContext = NonNullable<ReturnType<typeof buildWeeklyLetterContext>>;

export function writeWeeklyLetterFallback(context: WeeklyLetterContext): LetterContent {
  const latest = context.checkIns[0];
  const reflection = context.journal[0]?.reflection || latest?.reflection;
  const completed = context.progress.find((item) => item.completed);
  const planned = context.progress.find((item) => item.kind === "action" && !item.completed);
  const progress = context.progress[0];
  const lookingBack = context.evidence === "history";
  const time = lookingBack ? "earlier" : "recently";
  const introduction = lookingBack
    ? "I have no new entries for this goal in this reflection, so I’m looking back at what I recorded before. "
    : "";
  const opening = reflection
    ? `In a reflection I wrote ${time}, I said, “${excerpt(reflection.replace(/\s+/g, " "), 220)}” I want to notice what I still recognize in those words today.`
    : latest
      ? `I checked in with how I was thinking, feeling, and acting ${time}. I rated them ${latest.thinking}, ${latest.feeling}, and ${latest.acting} out of 10. I can use that snapshot to consider what still fits and where I need more support.`
      : progress
        ? `In the progress I recorded ${time}, I noted “${progress.text}” I want to consider what that means for my next step.`
        : "I have a goal that matters to me, and I have little written about how things have felt lately. I can start by noticing what took up my attention and which choices I want to repeat.";

  return {
    subject: "A moment to notice where I am",
    paragraphs: [
      introduction + opening,
      `The reality I’m working toward is “${context.desiredReality}” I can look at the choices that are helping me make room for it.${completed ? ` One thing I marked complete was “${completed.text}” I want to pause and give myself credit for that.` : ""}`,
      planned
        ? `This week, I want to give one action I’ve already named a place on my calendar. I’ll start with “${planned.text}” If I keep putting it off, I can make the first step small enough to try in ten minutes.`
        : "This week, I’ll choose one small action that supports this goal and decide when I’ll do it. If my current approach feels useful, I’ll repeat what helped. If I keep getting stuck at the same point, I’ll make the next step smaller and try again.",
    ],
  };
}

export function cleanWeeklyLetter(value: unknown): LetterContent | null {
  if (!value || typeof value !== "object" || !("subject" in value) || !("paragraphs" in value))
    return null;
  const { subject, paragraphs } = value;
  if (typeof subject !== "string" || !subject.trim() || subject.length > 100 ||
      !Array.isArray(paragraphs) || paragraphs.length !== 3) return null;
  const [current, intention, next] = paragraphs;
  if (![current, intention, next].every((paragraph) =>
    typeof paragraph === "string" &&
    paragraph.trim().length >= 25 &&
    paragraph.length <= 1500 &&
    /\b(?:I|me|my|myself)\b/.test(paragraph),
  )) return null;
  return { subject: subject.trim(), paragraphs: [current.trim(), intention.trim(), next.trim()] };
}

function checkInDay(entry: CheckInResult) {
  return entry.checkInDate ?? entry.createdAt.slice(0, 10);
}

function excerpt(text: string, limit: number) {
  const value = text.trim();
  return value.length > limit ? `${value.slice(0, limit - 1).trimEnd()}…` : value;
}
