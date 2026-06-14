export function TeachingCard({
  category,
  principle,
  application,
  question,
}: {
  category: string;
  principle: string;
  application: string;
  question: string;
}) {
  return (
    <article className="aura-glass flex min-h-[320px] flex-col rounded-lg p-5">
      <p className="text-xs uppercase tracking-[0.24em] text-primary">
        {category}
      </p>
      <h2 className="mt-4 font-serif text-2xl font-semibold leading-8">
        {principle}
      </h2>
      <div className="mt-auto pt-6">
        <p className="text-sm leading-6 text-muted-foreground">
          <span className="text-foreground">Practice:</span> {application}
        </p>
        <p className="mt-4 text-sm leading-6 text-muted-foreground">
          <span className="text-foreground">Reflect:</span> {question}
        </p>
      </div>
    </article>
  );
}
