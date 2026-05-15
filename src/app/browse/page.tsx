import { Suspense } from "react";
import type { Metadata } from "next";
import { BrowseFilters } from "@/components/BrowseFilters";
import { BrowseResults } from "@/components/BrowseResults";
import { getAllEvals } from "@/lib/evals";

export const metadata: Metadata = {
  title: "Browse all patterns · AI PM Eval Library",
  openGraph: {
    images: ["/opengraph-image"],
  },
};

export default function BrowsePage() {
  return (
    <main className="mx-auto grid max-w-6xl gap-10 px-6 py-10 lg:grid-cols-[280px_minmax(0,1fr)]">
      <aside className="lg:sticky lg:top-8 lg:self-start">
        <h1 className="text-3xl font-semibold tracking-tight">Browse</h1>
        <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-400">Filter the library by the kind of feature you are building.</p>
        <div className="mt-8">
          <Suspense fallback={null}>
            <BrowseFilters />
          </Suspense>
        </div>
      </aside>

      <Suspense fallback={<div className="text-sm text-slate-500">Loading patterns…</div>}>
        <BrowseResults patterns={getAllEvals()} />
      </Suspense>
    </main>
  );
}
