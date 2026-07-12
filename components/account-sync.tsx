"use client";

import { useEffect, useRef } from "react";
import {
  clearLocalAccountData,
  getCurrentAccount,
  syncLocalDataToAccount,
} from "@/lib/account-data";
import { createSupabaseBrowserClient, isSupabaseConfigured } from "@/lib/supabase/client";

export const ACCOUNT_DATA_SYNCED_EVENT = "clearpth:account-data-synced";

export function AccountSync() {
  const syncTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const syncing = useRef(false);
  const clearedGuestData = useRef(false);

  useEffect(() => {
    if (!isSupabaseConfigured()) return;

    const supabase = createSupabaseBrowserClient();

    const runSync = () => {
      if (syncTimer.current) clearTimeout(syncTimer.current);

      syncTimer.current = setTimeout(() => {
        if (syncing.current) return;
        syncing.current = true;

        getCurrentAccount()
          .then((user) => {
            if (!user) {
              if (!clearedGuestData.current) {
                clearLocalAccountData();
                clearedGuestData.current = true;
              }
              return null;
            }

            clearedGuestData.current = false;
            return syncLocalDataToAccount();
          })
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

    return () => {
      if (syncTimer.current) clearTimeout(syncTimer.current);
      data.subscription.unsubscribe();
    };
  }, []);

  return null;
}
