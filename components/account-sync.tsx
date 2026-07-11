"use client";

import { useEffect, useRef } from "react";
import { CHECK_INS_CHANGED_EVENT } from "@/lib/alignment";
import { syncLocalDataToAccount } from "@/lib/account-data";
import { JOURNAL_CHANGED_EVENT } from "@/lib/journal-storage";
import { ONBOARDING_CHANGED_EVENT } from "@/lib/onboarding-storage";
import { createSupabaseBrowserClient, isSupabaseConfigured } from "@/lib/supabase/client";

export const ACCOUNT_DATA_SYNCED_EVENT = "clearpth:account-data-synced";

export function AccountSync() {
  const syncTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const syncing = useRef(false);

  useEffect(() => {
    if (!isSupabaseConfigured()) return;

    const supabase = createSupabaseBrowserClient();

    const runSync = () => {
      if (syncTimer.current) clearTimeout(syncTimer.current);

      syncTimer.current = setTimeout(() => {
        if (syncing.current) return;
        syncing.current = true;

        syncLocalDataToAccount()
          .then((result) => {
            if (result) {
              window.dispatchEvent(new Event(ACCOUNT_DATA_SYNCED_EVENT));
            }
          })
          .catch(() => {
            // Account sync should never interrupt the local-first experience.
          })
          .finally(() => {
            syncing.current = false;
          });
      }, 500);
    };

    runSync();

    const { data } = supabase.auth.onAuthStateChange(() => runSync());
    window.addEventListener(CHECK_INS_CHANGED_EVENT, runSync);
    window.addEventListener(JOURNAL_CHANGED_EVENT, runSync);
    window.addEventListener(ONBOARDING_CHANGED_EVENT, runSync);

    return () => {
      if (syncTimer.current) clearTimeout(syncTimer.current);
      data.subscription.unsubscribe();
      window.removeEventListener(CHECK_INS_CHANGED_EVENT, runSync);
      window.removeEventListener(JOURNAL_CHANGED_EVENT, runSync);
      window.removeEventListener(ONBOARDING_CHANGED_EVENT, runSync);
    };
  }, []);

  return null;
}
