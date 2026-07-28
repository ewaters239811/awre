"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  BarChart3,
  Compass,
  Headphones,
  Home,
  MessageCircle,
  PenLine,
  Settings,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { getCurrentAccount } from "@/lib/account-data";
import { cn } from "@/lib/utils";

const links = [
  { href: "/", label: "Home" },
  { href: "/check-in", label: "Check In" },
  { href: "/review", label: "Today" },
  { href: "/tune-in", label: "Meditation" },
  { href: "/ritual", label: "Journal" },
  { href: "/dashboard", label: "Progress" },
  { href: "/guide", label: "Talk" },
];

const mobileLinks = [
  { href: "/", label: "Home", icon: Home },
  { href: "/check-in", label: "Check", icon: PenLine },
  { href: "/review", label: "Today", icon: Compass },
  { href: "/tune-in", label: "Calm", icon: Headphones },
  { href: "/guide", label: "Talk", icon: MessageCircle },
  { href: "/dashboard", label: "Track", icon: BarChart3 },
];

export function Navigation() {
  const pathname = usePathname();
  const router = useRouter();
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  const isSettings = pathname === "/settings";

  useEffect(() => {
    queueMicrotask(() => {
      getCurrentAccount().then((user) => setSignedIn(Boolean(user)));
    });
  }, [pathname]);

  if (
    pathname === "/login" ||
    pathname === "/reset-password" ||
    pathname === "/onboarding" ||
    (pathname === "/" && signedIn !== true)
  ) {
    return null;
  }

  const openSettingsOrGoBack = () => {
    if (isSettings) {
      if (window.history.length > 1) {
        router.back();
      } else {
        router.push("/");
      }
      return;
    }

    router.push("/settings");
  };

  return (
    <>
    <header className="sticky top-0 z-50 border-b border-border/35 bg-background/76 backdrop-blur-2xl">
      <nav className="container flex h-14 items-center justify-between lg:h-20">
        <Link href="/" className="flex items-center gap-3">
          <span className="flex h-8 w-8 items-center justify-center rounded-xl border border-primary/22 bg-[linear-gradient(145deg,rgba(216,190,132,0.18),rgba(90,140,118,0.08))] text-foreground shadow-sm lg:h-9 lg:w-9 lg:rounded-lg">
            <svg
              viewBox="0 0 36 36"
              className="h-4 w-4 lg:h-6 lg:w-6"
              fill="none"
              aria-hidden
            >
              <path
                d="M18 4 29 18 18 32 7 18 18 4Z"
                stroke="currentColor"
                strokeWidth="2.4"
                strokeLinejoin="round"
              />
              <path
                d="M12 21.5c2.1 2.6 5.6 3.8 9 2.9 3.5-.9 6-3.9 6.1-7.3"
                stroke="currentColor"
                strokeWidth="2.6"
                strokeLinecap="round"
              />
              <path
                d="M24 14.5c-2-2.2-5.1-3.1-8.1-2.3-3.5.9-6 3.9-6.1 7.3"
                stroke="currentColor"
                strokeWidth="2.6"
                strokeLinecap="round"
                opacity="0.55"
              />
              <circle cx="18" cy="18" r="2.2" fill="currentColor" />
            </svg>
          </span>
          <span className="text-[15px] font-semibold tracking-normal text-foreground lg:text-xl">
            ClearPth
          </span>
        </Link>

        <div className="hidden items-center gap-1 rounded-full border border-border/42 bg-card/24 p-1 lg:flex">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "rounded-full px-3.5 py-2 text-sm text-muted-foreground transition hover:bg-accent/55 hover:text-foreground",
                pathname === link.href &&
                  "bg-[linear-gradient(135deg,#f4efe4,#d8be84)] text-background shadow-[0_8px_20px_rgba(0,0,0,0.2)] hover:text-background",
              )}
            >
              {link.label}
            </Link>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            className="hidden lg:inline-flex"
            onClick={openSettingsOrGoBack}
          >
            <Settings className="h-4 w-4" aria-hidden />
            {isSettings ? "Back" : "Settings"}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 rounded-full border border-border/40 bg-card/20 lg:hidden"
            aria-label={isSettings ? "Go back" : "Open settings"}
            onClick={openSettingsOrGoBack}
          >
            <Settings className="h-5 w-5" aria-hidden />
          </Button>
        </div>
      </nav>
    </header>
    <MobileTabBar pathname={pathname} />
    </>
  );
}

function MobileTabBar({ pathname }: { pathname: string }) {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 bg-gradient-to-t from-background via-background/92 to-transparent px-3 pb-[calc(env(safe-area-inset-bottom)+0.7rem)] pt-5 backdrop-blur-xl lg:hidden">
      <div className="mx-auto grid max-w-[26rem] grid-cols-6 gap-1 rounded-[1.45rem] border border-border/42 bg-card/78 p-1.5 shadow-[0_18px_48px_rgba(0,0,0,0.34)]">
        {mobileLinks.map((link) => {
          const Icon = link.icon;
          const active =
            pathname === link.href ||
            (link.href !== "/" && pathname.startsWith(link.href));

          return (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "flex min-h-[3.15rem] flex-col items-center justify-center gap-1 rounded-[1.05rem] px-0.5 py-2 text-[9px] font-medium leading-none text-muted-foreground transition",
                active &&
                  "bg-[linear-gradient(135deg,#f4efe4,#d8be84_58%,#91b39e)] text-background shadow-[0_8px_20px_rgba(0,0,0,0.22)]",
              )}
            >
              <Icon className="h-4 w-4" aria-hidden />
              <span>{link.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
