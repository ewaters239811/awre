"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { isPasswordRecoveryHash } from "@/lib/auth-redirect";
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

    const isRecoveryHash = isPasswordRecoveryHash(window.location.hash);

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
