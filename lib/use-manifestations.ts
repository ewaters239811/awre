"use client";

import { useEffect, useState } from "react";
import {
  getOnboardingProfile,
  ONBOARDING_CHANGED_EVENT,
} from "@/lib/onboarding-storage";
import { primaryManifestation } from "@/lib/manifestations";
import type { OnboardingProfile } from "@/lib/types";

export function useManifestations() {
  const [profile, setProfile] = useState<OnboardingProfile | null>(null);
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    const refresh = () => {
      setProfile(getOnboardingProfile());
      setLoaded(true);
    };
    queueMicrotask(refresh);
    window.addEventListener(ONBOARDING_CHANGED_EVENT, refresh);
    window.addEventListener("clearpth:account-data-synced", refresh);
    return () => {
      window.removeEventListener(ONBOARDING_CHANGED_EVENT, refresh);
      window.removeEventListener("clearpth:account-data-synced", refresh);
    };
  }, []);
  return {
    profile,
    primary: primaryManifestation(profile),
    state: profile?.manifestations,
    loaded,
  };
}
