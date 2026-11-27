import { NextResponse } from "next/server";
import { getAccountPostgrest } from "@/lib/server/account";
import { generateWeeklyLetter } from "@/lib/server/weekly-letters";
import { getWeeklyLetterPreviewWindow } from "@/lib/weekly-letters";

export async function POST(request: Request) {
  let window;
  try {
    const { timeZone } = await request.json();
    if (typeof timeZone !== "string" || timeZone.length > 100)
      return NextResponse.json({ error: "Invalid time zone." }, { status: 400 });
    window = getWeeklyLetterPreviewWindow(new Date(), timeZone);
  } catch {
    return NextResponse.json({ error: "Invalid time zone." }, { status: 400 });
  }

  try {
    const account = await getAccountPostgrest(request.headers.get("authorization"));
    if (!account)
      return NextResponse.json({ error: "Sign in to preview your letter." }, { status: 401 });
    const letter = await generateWeeklyLetter(account.client, account.userId, window);
    if (!letter)
      return NextResponse.json({ error: "Choose an active desired reality first." }, { status: 409 });
    return NextResponse.json({ letter }, { headers: { "Cache-Control": "private, no-store" } });
  } catch {
    return NextResponse.json({ error: "The test letter couldn’t be generated." }, { status: 503 });
  }
}
