"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  createSupabaseBrowserClient,
  isSupabaseConfigured,
} from "@/lib/supabase/client";

export function PasswordRecoveryRedirect() {
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (!isSupabaseConfigured()) return;

    const supabase = createSupabaseBrowserClient();

    const sendToResetPage = () => {
      if (window.location.pathname === "/reset-password") return;

      const hash = window.location.hash;
      router.replace(`/reset-password${hash}`);
    };

    const hashParams = new URLSearchParams(
      window.location.hash.replace(/^#/, ""),
    );
    const isRecoveryHash =
      hashParams.get("type") === "recovery" ||
      hashParams.get("access_token") ||
      hashParams.get("refresh_token");

    if (isRecoveryHash && pathname !== "/reset-password") {
      sendToResetPage();
    }

    const { data } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        sendToResetPage();
      }
    });

    return () => {
      data.subscription.unsubscribe();
    };
  }, [pathname, router]);

  return null;
}
