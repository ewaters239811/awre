"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { cn } from "@/lib/utils";

const links = [
  { href: "/", label: "Home" },
  { href: "/dashboard", label: "Analysis" },
  { href: "/ritual", label: "Ritual" },
  { href: "/check-in", label: "Check-In" },
  { href: "/history", label: "History" },
  { href: "/review", label: "Review" },
  { href: "/guide", label: "Guide" },
  { href: "/teachings", label: "Teachings" },
  { href: "/about", label: "About" },
];

export function Navigation() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-border/50 bg-background/70 backdrop-blur-2xl">
      <nav className="container flex h-20 items-center justify-between">
        <Link href="/" className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-md border border-border bg-foreground text-background">
            <span
              className="h-0 w-0 border-x-[7px] border-b-[12px] border-x-transparent border-b-current"
              aria-hidden
            />
          </span>
          <span className="text-xl font-semibold tracking-[-0.02em] text-foreground">
            ClearPth
          </span>
        </Link>

        <div className="hidden items-center gap-1 rounded-md border border-border/55 bg-card/35 p-1 lg:flex">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "rounded-md px-3 py-2 text-sm text-muted-foreground transition hover:bg-white/[0.07] hover:text-foreground",
                pathname === link.href &&
                  "bg-foreground text-background hover:bg-foreground hover:text-background",
              )}
            >
              {link.label}
            </Link>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <ThemeToggle />
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
        <div className="container grid gap-1 pb-4 lg:hidden">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setOpen(false)}
              className={cn(
                "rounded-md px-3 py-3 text-sm text-muted-foreground transition hover:bg-white/[0.07] hover:text-foreground",
                pathname === link.href &&
                  "bg-foreground text-background hover:bg-foreground hover:text-background",
              )}
            >
              {link.label}
            </Link>
          ))}
        </div>
      ) : null}
    </header>
  );
}
