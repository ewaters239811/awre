import { Brain, Flame, Heart } from "lucide-react";
import { CheckInStreak } from "@/components/check-in-streak";
import { HomeHero } from "@/components/home-hero";
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
      <section className="container grid min-h-[calc(100vh-5rem)] items-center gap-10 py-8 md:grid-cols-[1.05fr_0.95fr] md:gap-12 md:py-16">
        <HomeHero />

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
      <section className="container pb-12">
        <CheckInStreak />
      </section>
    </main>
  );
}
