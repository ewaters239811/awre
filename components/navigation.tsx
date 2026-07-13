"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut, Menu } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { getCurrentAccount, signOutOfAccount } from "@/lib/account-data";
import { cn } from "@/lib/utils";

const links = [
  { href: "/", label: "Home" },
  { href: "/check-in", label: "Check In" },
  { href: "/review", label: "Today" },
  { href: "/ritual", label: "Journal" },
  { href: "/dashboard", label: "Patterns" },
  { href: "/guide", label: "Guide" },
  { href: "/settings", label: "Settings" },
];

export function Navigation() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);

  useEffect(() => {
    queueMicrotask(() => {
      getCurrentAccount().then((user) => setUserEmail(user?.email ?? null));
    });
  }, [pathname]);

  const signOut = async () => {
    await signOutOfAccount();
    setUserEmail(null);
    setOpen(false);
  };

  return (
    <header className="sticky top-0 z-50 border-b border-border/50 bg-background/70 backdrop-blur-2xl">
      <nav className="container flex h-20 items-center justify-between">
        <Link href="/" className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-md border border-border bg-foreground text-background">
            <svg
              viewBox="0 0 36 36"
              className="h-6 w-6"
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
          <span className="text-xl font-semibold tracking-normal text-foreground">
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
          {userEmail ? (
            <Button
              variant="secondary"
              size="sm"
              className="hidden lg:inline-flex"
              onClick={signOut}
            >
              <LogOut className="h-4 w-4" aria-hidden />
              Sign Out
            </Button>
          ) : (
            <Button asChild size="sm" className="hidden lg:inline-flex">
              <Link href="/login">Sign In</Link>
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={() => setOpen((value) => !value)}
            aria-label="Open navigation"
          >
            <Menu className="h-5 w-5" />
          </Button>
        </div>
      </nav>
      {open ? (
        <div className="container grid max-h-[calc(100dvh-5rem)] gap-1 overflow-y-auto pb-4 lg:hidden">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setOpen(false)}
              className={cn(
                "rounded-md px-3 py-3 text-sm text-muted-foreground transition hover:bg-accent/70 hover:text-foreground",
                pathname === link.href &&
                  "bg-foreground text-background hover:bg-foreground hover:text-background",
              )}
            >
              {link.label}
            </Link>
          ))}
          <div className="mt-2 border-t border-border/60 pt-3">
            {userEmail ? (
              <Button variant="secondary" className="w-full" onClick={signOut}>
                <LogOut className="h-4 w-4" aria-hidden />
                Sign Out
              </Button>
            ) : (
              <Button asChild className="w-full">
                <Link href="/login" onClick={() => setOpen(false)}>
                  Sign In
                </Link>
              </Button>
            )}
          </div>
        </div>
      ) : null}
    </header>
  );
}
