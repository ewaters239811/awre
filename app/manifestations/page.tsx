import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { ManifestationManager } from "@/components/manifestation-manager";

export default function ManifestationsPage() {
  return (
    <main className="clearpth-page-shell">
      <div className="mx-auto max-w-3xl">
        <Link
          href="/"
          className="inline-flex min-h-11 items-center gap-2 text-sm text-muted-foreground"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          Home
        </Link>
        <p className="clearpth-page-kicker mt-5">Your Desired Reality</p>
        <h1 className="clearpth-page-title">Give your desire direction.</h1>
        <p className="mt-4 max-w-xl text-sm leading-7 text-muted-foreground">
          Define what you want to create. Choose one daily focus, and keep the
          others here.
        </p>
        <ManifestationManager />
      </div>
    </main>
  );
}
