import { Suspense } from "react";
import type { Metadata } from "next";
import { BrowseFilters } from "@/components/BrowseFilters";
import { EvalCard } from "@/components/EvalCard";
import { filterPatterns, listPublications } from "@/lib/browse";
import type { CardFields } from "@/lib/evals";
import { getAllEvals, getSpecimenNumber } from "@/lib/evals";

export const metadata: Metadata = {
  title: "Browse",
  openGraph: {
    images: ["/opengraph-image"],
  },
};

type BrowsePageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function BrowsePage({ searchParams }: BrowsePageProps) {
  const params = await searchParams;
  const patterns = getAllEvals();
  const filters = {
    query: readParam(params, "q"),
    featureTypes: readParam(params, "ft").split(",").filter(Boolean),
    categories: readParam(params, "cat").split(",").filter(Boolean),
    difficulty: readParam(params, "difficulty"),
    publication: readParam(params, "pub"),
  };
  const filtered = filterPatterns(patterns, filters);
  const filterKey = new URLSearchParams(
    Object.entries({
      q: filters.query,
      ft: filters.featureTypes.join(","),
      cat: filters.categories.join(","),
      difficulty: filters.difficulty,
      pub: filters.publication,
    }).filter((entry): entry is [string, string] => Boolean(entry[1])),
  ).toString();

  return (
    <main className="mx-auto grid w-full max-w-6xl gap-10 px-4 py-10 sm:px-6 lg:grid-cols-[240px_minmax(0,1fr)]">
      <aside className="lg:sticky lg:top-20 lg:max-h-[calc(100vh-6rem)] lg:self-start lg:overflow-y-auto">
        <h1 className="text-4xl tracking-tight text-ink">Browse</h1>
        <p className="mt-2 text-sm leading-6 text-muted">Filter the library by the kind of feature you are building.</p>
        <div className="mt-8">
          <Suspense fallback={null}>
            <BrowseFilters publications={listPublications(patterns)} />
          </Suspense>
        </div>
      </aside>

      <section className="min-w-0">
        <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-muted">
          Showing {filtered.length} of {patterns.length} specimens
        </p>
        {filtered.length === 0 ? (
          <p className="mt-6 border border-dashed border-line px-4 py-6 text-sm leading-6 text-muted">
            No specimens match these filters.
          </p>
        ) : (
          <div key={filterKey} className="stagger mt-6 grid gap-6 sm:grid-cols-2">
            {filtered.map((pattern, index) => (
              <div key={pattern.id} className="reveal min-w-0" style={{ ["--i" as string]: index }}>
                <EvalCard pattern={toCard(pattern)} specimen={getSpecimenNumber(pattern.id)} />
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}

function readParam(params: Record<string, string | string[] | undefined>, key: string) {
  const value = params[key];
  return Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
}

function toCard(pattern: CardFields): CardFields {
  return {
    id: pattern.id,
    name: pattern.name,
    one_liner: pattern.one_liner,
    category: pattern.category,
    difficulty: pattern.difficulty,
    feature_types: pattern.feature_types,
    source_operator: pattern.source_operator,
    source_publication: pattern.source_publication,
    source_date: pattern.source_date,
  };
}
