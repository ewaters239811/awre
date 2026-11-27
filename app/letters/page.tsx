import type { Metadata } from "next";
import Link from "next/link";
import { WeeklyLetterInbox } from "@/components/weekly-letter-inbox";

export const metadata: Metadata = {
  title: "Weekly Letters | ClearPth",
};

export default function LettersPage() {
  return (
    <main className="clearpth-page-shell">
      <div className="mx-auto max-w-2xl">
        <Link
          href="/"
          className="inline-flex min-h-11 items-center text-sm text-muted-foreground underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          Back to Home
        </Link>
        <header className="mt-5 border-b border-border/60 pb-6">
          <p className="clearpth-page-kicker">Weekly letters</p>
          <h1 className="clearpth-page-title">Letter from My Unconscious Mind</h1>
          <p className="mt-4 max-w-xl leading-7 text-muted-foreground">
            A Sunday reflection written in your voice, drawing on your check-ins, journal,
            and the reality you’re working toward.
          </p>
        </header>
        <WeeklyLetterInbox />
      </div>
    </main>
  );
}
