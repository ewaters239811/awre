import { getCheckInForDate, updateCheckIn } from "@/lib/alignment";
import { saveCheckInToAccount } from "@/lib/account-data";
import { toCheckInDateKey } from "@/lib/date-key";

export async function markTodayRead() {
  const result = getCheckInForDate(toCheckInDateKey(new Date()));
  if (!result || result.readAt) return;
  const next = { ...result, readAt: new Date().toISOString() };
  await saveCheckInToAccount(next);
  updateCheckIn(next);
}
