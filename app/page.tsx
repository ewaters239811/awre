import Link from "next/link";
import { ArrowRight, Brain, Flame, Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PillarCard } from "@/components/pillar-card";

const pillars = [
  {
    title: "Thinking",
    icon: Brain,
    description:
      "The thoughts, images, distractions, and charged inner narratives directing your perception.",
  },
  {
    title: "Willing",
    icon: Flame,
    description:
      "The visible and invisible actions, habits, avoidances, and inspired moves shaping your day.",
  },
  {
    title: "Feeling",
    icon: Heart,
    description:
      "The emotional current, impulse, belief, mood, and faith charging the identity you inhabit.",
  },
];

export default function HomePage() {
  return (
    <main>
      <section className="container grid min-h-[calc(100vh-5rem)] items-center gap-12 py-10 md:grid-cols-[1.05fr_0.95fr] md:py-16">
        <div className="max-w-3xl">
          <p className="mb-5 text-sm uppercase tracking-[0.32em] text-primary">
            Thinking | Willing | Feeling = Being
          </p>
          <h1 className="font-serif text-7xl font-semibold leading-[0.88] text-foreground sm:text-8xl lg:text-9xl">
            ClearPth
          </h1>
          <div className="aura-luxury-line mt-7 max-w-lg" />
          <p className="mt-7 max-w-2xl text-xl leading-8 text-foreground/86 sm:text-2xl">
            A daily mirror for inner order, clear action, and embodied presence.
          </p>
          <p className="mt-6 max-w-2xl text-base leading-7 text-muted-foreground">
            A free self-reflection ritual for noticing the inner pattern behind
            your outer presence, then choosing one clear correction for today.
          </p>
          <Button asChild size="lg" className="mt-8">
            <Link href="/check-in">
              Begin Alignment Check-In
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
          </Button>
        </div>

        <div className="aura-glass rounded-lg p-5 md:p-6">
          <div className="rounded-md border border-border bg-card p-5">
            <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">
              Integrated State
            </p>
            <p className="mt-2 font-serif text-4xl font-semibold text-foreground">
              Being
            </p>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              Your integrated state: the quality others feel when your mind,
              movement, and emotional charge begin to agree.
            </p>
          </div>
          <div className="mt-5 grid gap-4">
            {pillars.map((pillar) => (
              <PillarCard key={pillar.title} {...pillar} />
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
