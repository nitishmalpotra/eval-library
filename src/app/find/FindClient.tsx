"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { EvalCard } from "@/components/EvalCard";
import { getAllEvals, type FindMatch } from "@/lib/evals";

type ApiFindMatch = Omit<FindMatch, "pattern">;

const repoUrl = process.env.NEXT_PUBLIC_REPO_URL ?? "https://github.com/nitishmalpotra/eval-library";

export function FindClient() {
  const searchParams = useSearchParams();
  const starterQuery = searchParams.get("q") ?? "";
  const [query, setQuery] = useState(starterQuery);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<FindMatch[] | null>(null);
  const [creditsExhausted, setCreditsExhausted] = useState(false);
  const resultsRef = useRef<HTMLDivElement>(null);
  const patternsById = useMemo(() => new Map(getAllEvals().map((pattern) => [pattern.id, pattern])), []);
  const totalPatterns = patternsById.size;

  useEffect(() => {
    setQuery(starterQuery);
  }, [starterQuery]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsLoading(true);
    setError(null);
    setCreditsExhausted(false);

    try {
      const response = await fetch("/api/find", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ query }),
      });
      const data = (await response.json()) as { creditsExhausted?: boolean; error?: string; matches?: ApiFindMatch[] };

      if (!response.ok) {
        setResults(null);
        setError(data.error ?? "Unable to find evals right now");
        return;
      }

      if (data.creditsExhausted) {
        setCreditsExhausted(true);
        setResults(null);
        return;
      }

      const matches = (data.matches ?? [])
        .map((match) => {
          const pattern = patternsById.get(match.id);
          return pattern ? { ...match, pattern } : null;
        })
        .filter((match): match is FindMatch => Boolean(match));

      setResults(matches);
      requestAnimationFrame(() => {
        resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    } catch {
      setResults(null);
      setError("Unable to find evals right now");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <main className="mx-auto w-full max-w-3xl px-6 py-12 text-slate-950 dark:text-slate-100">
      <header>
        <Link href="/learn" className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400">
          First time here? See how it works →
        </Link>
        <h1 className="mt-4 text-3xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">
          Find an eval for your feature
        </h1>
        <p className="mt-3 text-slate-600 dark:text-slate-400">
          Describe what you are building. We will surface the three closest patterns from the library.
        </p>
      </header>

      <form id="find-form" className="mt-8" onSubmit={handleSubmit}>
        <label htmlFor="query" className="sr-only">
          Describe your AI feature
        </label>
        <textarea
          id="query"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          rows={5}
          className="w-full rounded-md border border-gray-300 bg-white px-4 py-3 text-slate-900 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
          placeholder="I'm building a customer support chatbot that pulls answers from a help center. What evals should I have?"
        />
        <div className="mt-4 flex justify-end">
          <button
            type="submit"
            disabled={isLoading}
            className="rounded-md bg-blue-600 px-5 py-2.5 text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-400 dark:bg-blue-500"
          >
            {isLoading ? "Finding..." : "Find evals"}
          </button>
        </div>
      </form>

      {!isLoading && creditsExhausted && (
        <section className="my-6 rounded-lg border border-amber-200 bg-amber-50 p-6 dark:border-amber-800 dark:bg-amber-950/30">
          <p className="text-sm text-amber-700 dark:text-amber-300">DEMO LIMIT REACHED</p>
          <h2 className="mt-2 text-lg font-semibold text-slate-900 dark:text-slate-100">
            The live demo&apos;s API credits are exhausted for now.
          </h2>
          <p className="mt-3 text-slate-700 dark:text-slate-300">
            The semantic search relies on a paid API and the budget on this hosted demo has run out. The full library is
            still browseable, and you can keep using the search by self-hosting with your own API keys — instructions in
            the README take about 5 minutes.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link
              href="/browse"
              className="rounded-md bg-blue-600 px-4 py-2.5 text-white transition hover:bg-blue-700 dark:bg-blue-500"
            >
              Browse all {totalPatterns} patterns →
            </Link>
            <a
              href={`${repoUrl}#quickstart`}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-md border border-slate-300 bg-white px-4 py-2.5 text-slate-900 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
            >
              Self-host with your own keys →
            </a>
          </div>
        </section>
      )}

      <div ref={resultsRef} className="mt-10 space-y-6">
        {isLoading &&
          Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="h-40 animate-pulse rounded-2xl bg-slate-100 dark:bg-slate-900" />
          ))}

        {!isLoading && error && (
          <div className="flex items-center justify-between gap-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-300">
            <span>{error}</span>
            <button type="submit" form="find-form" className="font-medium underline underline-offset-2">
              Try again
            </button>
          </div>
        )}

        {!isLoading && !creditsExhausted && !error && results === null && (
          <p className="text-sm leading-6 text-slate-500 dark:text-slate-400">
            Try: &apos;I&apos;m building an agent that books meetings on my calendar&apos; or &apos;I need evals for a
            RAG-based search over our docs.&apos;
          </p>
        )}

        {!isLoading &&
          results?.map((match) => (
            <section key={match.id}>
              <p className="mb-3 italic text-slate-600 dark:text-slate-400">Why this fits: {match.rationale}</p>
              <EvalCard pattern={match.pattern} />
            </section>
          ))}
      </div>

      {!isLoading && results && results.length > 0 && (
        <footer className="mt-10">
          <Link href="/browse" className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400">
            Not seeing the right pattern? Browse all {totalPatterns} →
          </Link>
        </footer>
      )}
    </main>
  );
}
