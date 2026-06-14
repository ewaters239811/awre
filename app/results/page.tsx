import { Suspense } from "react";
import { ResultsContent } from "@/components/results-content";

export default function ResultsPage() {
  return (
    <Suspense
      fallback={<main className="container py-12">Loading alignment...</main>}
    >
      <ResultsContent />
    </Suspense>
  );
}
