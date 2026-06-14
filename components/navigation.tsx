"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, Sparkles } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
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
    <header className="sticky top-0 z-50 border-b border-white/[0.06] bg-background/70 backdrop-blur-2xl">
      <nav className="container flex h-20 items-center justify-between">
        <Link href="/" className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-md border border-primary/30 bg-primary/10 shadow-[0_0_30px_rgba(202,170,105,0.12)]">
            <Sparkles className="h-5 w-5 text-primary" aria-hidden />
          </span>
          <span className="font-serif text-2xl font-semibold tracking-[0.08em] text-foreground">
            ClearPth
          </span>
        </Link>

        <div className="hidden items-center gap-1 rounded-md border border-white/[0.06] bg-white/[0.035] p-1 lg:flex">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "rounded-md px-3 py-2 text-sm text-muted-foreground transition hover:bg-white/[0.07] hover:text-foreground",
                pathname === link.href &&
                  "bg-primary/12 text-primary shadow-inner shadow-primary/5",
              )}
            >
              {link.label}
            </Link>
          ))}
        </div>

        <Button
          variant="ghost"
          size="icon"
          className="lg:hidden"
          onClick={() => setOpen((value) => !value)}
          aria-label="Open navigation"
        >
          <Menu className="h-5 w-5" />
        </Button>
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
                pathname === link.href && "bg-primary/10 text-primary",
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
