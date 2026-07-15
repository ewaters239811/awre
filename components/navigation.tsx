"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  BarChart3,
  Compass,
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
  { href: "/ritual", label: "Journal" },
  { href: "/dashboard", label: "Patterns" },
  { href: "/guide", label: "Guide" },
];

const mobileLinks = [
  { href: "/", label: "Home", icon: Home },
  { href: "/check-in", label: "Check", icon: PenLine },
  { href: "/review", label: "Today", icon: Compass },
  { href: "/guide", label: "Guide", icon: MessageCircle },
  { href: "/dashboard", label: "Patterns", icon: BarChart3 },
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
    <header className="sticky top-0 z-50 border-b border-border/50 bg-background/82 backdrop-blur-2xl">
      <nav className="container flex h-12 items-center justify-between lg:h-20">
        <Link href="/" className="flex items-center gap-3">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg border border-primary/20 bg-card/35 text-foreground shadow-sm lg:h-9 lg:w-9">
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
          <span className="text-sm font-semibold tracking-normal text-foreground lg:text-xl">
            ClearPth
          </span>
        </Link>

        <div className="hidden items-center gap-1 rounded-md border border-border/55 bg-card/35 p-1 lg:flex">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "rounded-md px-3 py-2 text-sm text-muted-foreground transition hover:bg-accent/70 hover:text-foreground",
                pathname === link.href &&
                  "bg-foreground text-background hover:bg-foreground hover:text-background",
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
            className="lg:hidden"
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
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border/60 bg-background/90 px-3 pb-[calc(env(safe-area-inset-bottom)+0.65rem)] pt-2 backdrop-blur-2xl lg:hidden">
      <div className="mx-auto grid max-w-[23rem] grid-cols-5 gap-1 rounded-[1.35rem] border border-border/60 bg-card/88 p-1.5 shadow-2xl">
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
                "flex min-h-12 flex-col items-center justify-center gap-1 rounded-2xl px-1 py-2 text-[10px] font-medium leading-none text-muted-foreground transition",
                active && "bg-foreground text-background shadow-sm",
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
