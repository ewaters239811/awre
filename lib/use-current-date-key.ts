"use client";

import { useEffect, useState } from "react";
import { toCheckInDateKey } from "@/lib/date-key";

export function useCurrentDateKey() {
  const [dateKey, setDateKey] = useState(() => toCheckInDateKey(new Date()));

  useEffect(() => {
    const refreshDateKey = () => setDateKey(toCheckInDateKey(new Date()));
    const intervalId = window.setInterval(refreshDateKey, 60_000);

    window.addEventListener("focus", refreshDateKey);
    document.addEventListener("visibilitychange", refreshDateKey);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener("focus", refreshDateKey);
      document.removeEventListener("visibilitychange", refreshDateKey);
    };
  }, []);

  return dateKey;
}
