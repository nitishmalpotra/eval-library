"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import type { EvalPattern } from "@/lib/evals";
import { EvalCard } from "./EvalCard";

export function BrowseResults({ patterns }: { patterns: EvalPattern[] }) {
  const searchParams = useSearchParams();
  const featureTypes = searchParams.get("ft")?.split(",").filter(Boolean) ?? [];
  const categories = searchParams.get("cat")?.split(",").filter(Boolean) ?? [];
  const difficulty = searchParams.get("difficulty") ?? "";
  const query = searchParams.get("q")?.trim().toLowerCase() ?? "";

  const filteredPatterns = patterns.filter((pattern) => {
    const matchesFeatureType =
      featureTypes.length === 0 || featureTypes.some((featureType) => pattern.feature_types.includes(featureType as never));
    const matchesCategory = categories.length === 0 || categories.includes(pattern.category);
    const matchesDifficulty = !difficulty || pattern.difficulty === difficulty;
    const haystack = [
      pattern.name,
      pattern.one_liner,
      pattern.definition,
      pattern.explanation,
      ...pattern.keywords,
    ]
      .join(" ")
      .toLowerCase();
    const matchesQuery = !query || haystack.includes(query);

    return matchesFeatureType && matchesCategory && matchesDifficulty && matchesQuery;
  });

  return (
    <section>
      <div className="mb-5 flex items-center justify-between border-b border-slate-200 pb-4 dark:border-slate-800">
        <p className="text-sm text-slate-500">{filteredPatterns.length} patterns</p>
        <Link href="/find" className="text-sm text-blue-600 dark:text-blue-400">
          Don&apos;t know where to start? Try Find →
        </Link>
      </div>
      {filteredPatterns.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 px-6 py-16 text-center text-slate-500 dark:border-slate-700">
          No patterns match. Try clearing some filters.
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filteredPatterns.map((pattern) => (
            <EvalCard key={pattern.id} pattern={pattern} />
          ))}
        </div>
      )}
    </section>
  );
}
