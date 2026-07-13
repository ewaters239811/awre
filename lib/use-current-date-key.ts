"use client";

import { useEffect, useState } from "react";
import { toDateKey } from "@/lib/date-key";

export function useCurrentDateKey() {
  const [dateKey, setDateKey] = useState(() => toDateKey(new Date()));

  useEffect(() => {
    const refreshDateKey = () => setDateKey(toDateKey(new Date()));
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
