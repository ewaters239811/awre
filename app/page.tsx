import type { LucideIcon } from "lucide-react";
import { ArrowRight, Eye, Footprints, Sparkles } from "lucide-react";
import { CheckInStreak } from "@/components/check-in-streak";
import { HomeHero } from "@/components/home-hero";

const benefits = [
  {
    title: "See where you are",
    icon: Eye,
    description:
      "Compare today to what you want.",
  },
  {
    title: "Shift how you feel",
    icon: Sparkles,
    description:
      "Move from stuck or scattered into something steadier.",
  },
  {
    title: "Take the next step",
    icon: Footprints,
    description:
      "Choose one clear action for today.",
  },
];

export default function HomePage() {
  return (
    <main>
      <section className="container grid min-h-[calc(100dvh-8rem)] items-start gap-7 py-8 md:min-h-[calc(100vh-5rem)] md:grid-cols-[1.05fr_0.95fr] md:items-center md:gap-14 md:py-16">
        <HomeHero />

        <div className="hidden rounded-xl border border-border/38 bg-card/18 p-4 backdrop-blur-xl md:block md:rounded-lg md:p-6">
          <div className="relative overflow-hidden rounded-md border border-border/45 bg-card/38 p-5">
            <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-primary via-[#bfa46a] to-primary" />
            <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">
              How It Works
            </p>
            <p className="mt-2 font-serif text-3xl font-semibold leading-tight text-foreground md:text-4xl">
              What you want becomes clearer.
            </p>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              ClearPth keeps what you want in view, then shows where you are
              and what to focus on next.
            </p>
            <div className="mt-5 grid grid-cols-[auto_1fr] gap-4">
              <div className="flex flex-col items-center">
                <span className="h-3 w-3 rounded-full bg-primary" />
                <span className="aura-path-line my-1 w-px flex-1 rounded-full" />
                <span className="h-3 w-3 rounded-full bg-[#bfa46a]" />
                <span className="aura-path-line my-1 w-px flex-1 rounded-full" />
                <span className="h-3 w-3 rounded-full bg-primary" />
              </div>
              <div className="grid gap-3">
                <PathStep label="Name" body="Say what you want." />
                <PathStep label="Check" body="See where you are today." />
                <PathStep label="Move" body="Take one clear next step." />
              </div>
            </div>
          </div>
          <div className="mt-5 grid gap-3 md:mt-6">
            {benefits.map((benefit) => (
              <BenefitCard key={benefit.title} {...benefit} />
            ))}
          </div>
        </div>
      </section>
      <section className="container hidden pb-8 md:block md:pb-12">
        <CheckInStreak />
      </section>
    </main>
  );
}

function BenefitCard({
  title,
  description,
  icon: Icon,
}: {
  title: string;
  description: string;
  icon: LucideIcon;
}) {
  return (
    <article className="aura-float-card rounded-md border border-border/45 bg-card/30 p-4">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-border/45 bg-background/45 text-foreground">
          <Icon className="h-5 w-5" aria-hidden />
        </span>
        <div>
          <div className="flex items-center gap-2">
            <h2 className="font-medium text-foreground">{title}</h2>
            <ArrowRight
              className="h-4 w-4 text-muted-foreground"
              aria-hidden
            />
          </div>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">
            {description}
          </p>
        </div>
      </div>
    </article>
  );
}

function PathStep({ label, body }: { label: string; body: string }) {
  return (
    <article className="rounded-md border border-border/42 bg-background/30 px-4 py-3">
      <p className="text-xs uppercase tracking-[0.2em] text-primary">{label}</p>
      <p className="mt-1 text-sm leading-6 text-muted-foreground">{body}</p>
    </article>
  );
}
