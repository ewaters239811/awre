import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { createWeeklyLetterClient, dispatchWeeklyLetters } from "@/lib/server/weekly-letters";
import { getWeeklyLetterEdition } from "@/lib/weekly-letters";

export const maxDuration = 50;

export async function POST(request: Request) {
  const secret = process.env.WEEKLY_LETTERS_CRON_SECRET;
  if (!secret) return NextResponse.json({ error: "Weekly delivery is unconfigured." }, { status: 503 });
  const expected = Buffer.from(`Bearer ${secret}`);
  const actual = Buffer.from(request.headers.get("authorization") ?? "");
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected))
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  try {
    const client = createWeeklyLetterClient();
    if (!client) return NextResponse.json({ error: "Weekly delivery is unconfigured." }, { status: 503 });
    const edition = getWeeklyLetterEdition(new Date());
    if (!edition) {
      const { error } = await client.from("weekly_letters")
        .select("week_of", { head: true }).limit(0);
      if (error) throw error;
      return NextResponse.json({ delivered: 0, failed: 0 });
    }
    const report = await dispatchWeeklyLetters(client, edition);
    return NextResponse.json(report, { status: report.failed ? 503 : 200 });
  } catch {
    return NextResponse.json({ error: "Weekly delivery could not run." }, { status: 503 });
  }
}
