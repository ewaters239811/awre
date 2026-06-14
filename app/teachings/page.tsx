import { TeachingQuote } from "@/components/teaching-quote";

export default function TeachingsPage() {
  return (
    <main className="container py-8 md:py-12">
      <div className="mx-auto max-w-3xl text-center">
        <p className="awre-page-kicker">Teachings</p>
        <h1 className="awre-page-title">
          A Teaching For Your Alignment
        </h1>
      </div>
      <TeachingQuote />
    </main>
  );
}
