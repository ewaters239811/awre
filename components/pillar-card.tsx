import type { LucideIcon } from "lucide-react";

export function PillarCard({
  title,
  description,
  icon: Icon,
}: {
  title: string;
  description: string;
  icon: LucideIcon;
}) {
  return (
    <article className="rounded-md border border-border/70 bg-card/60 p-4 transition duration-200 hover:border-foreground/30 hover:bg-accent">
      <div className="flex items-start gap-4">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-border bg-background text-foreground">
          <Icon className="h-5 w-5" aria-hidden />
        </span>
        <div>
          <h2 className="font-serif text-2xl font-semibold">{title}</h2>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">
            {description}
          </p>
        </div>
      </div>
    </article>
  );
}
