import { ChevronDown } from "lucide-react";
import { getCheckInPerspective } from "@/lib/wisdom";
import type { CheckInResult } from "@/lib/types";

export function DeeperReflection({ result }: { result: CheckInResult }) {
  const reading = getCheckInPerspective(result);
  if (!reading) return null;
  const { principle, perspective } = reading;

  return (
    <details className="group mt-5 max-w-3xl border-y border-border/45">
      <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 rounded-sm py-3 text-sm text-primary outline-none focus-visible:ring-2 focus-visible:ring-ring [&::-webkit-details-marker]:hidden">
        Go deeper
        <ChevronDown className="h-4 w-4 shrink-0 transition-transform group-open:rotate-180" aria-hidden />
      </summary>
      <div className="space-y-5 pb-5 pt-1 text-sm leading-7">
        <div>
          <h3 className="text-base font-medium text-foreground">{principle.title}</h3>
          <p className="mt-2 break-words text-foreground/85">{perspective.reflection}</p>
        </div>
        <p className="break-words font-medium text-foreground">{perspective.question}</p>
        <div>
          <p className="text-xs text-muted-foreground">A small practice</p>
          <p className="mt-1 break-words text-foreground/85">{perspective.practice}</p>
        </div>
      </div>
    </details>
  );
}
