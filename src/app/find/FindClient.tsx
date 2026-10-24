"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { FormEvent, useEffect, useRef, useState } from "react";
import { EvalCard } from "@/components/EvalCard";
import type { FindMatch, RejectionReason } from "@/lib/findTypes";

type View =
  | { kind: "idle" }
  | { kind: "error"; message: string }
  | { kind: "credits" }
  | { kind: "limited"; resetAt: string }
  | { kind: "rejected"; reason: RejectionReason }
  | { kind: "ok"; matches: FindMatch[] };

const rejectionMessages: Record<RejectionReason, string> = {
  gibberish:
    "We couldn't read that as a feature description. Describe your AI feature in plain words — what it does and who uses it.",
  too_vague:
    "That's too broad to match against the library. Add what the feature does and who uses it — e.g. 'a support chatbot that answers from our help center.'",
  off_topic:
    "This finder matches AI features to eval patterns. Describe the AI feature you're building and we'll surface the right evals.",
  no_match:
    "Nothing in the library is close enough to that description. Add what the feature does and who uses it, or browse the full library.",
  not_a_request:
    "This finder matches a feature description to eval patterns. It can't follow other instructions. Describe the AI feature you're building.",
};

const rewrites: Record<RejectionReason, string[]> = {
  gibberish: [
    "a support chatbot that answers from our help center",
    "a coding agent that opens pull requests",
    "RAG search over our internal docs",
  ],
  too_vague: [
    "a support chatbot that answers from our help center",
    "an agent that books meetings on my calendar",
    "evals for a RAG search over our docs",
  ],
  off_topic: [
    "a support chatbot that answers from our help center",
    "a classifier that routes support tickets",
    "a code review bot for pull requests",
  ],
  no_match: [
    "a support chatbot that answers from our help center docs",
    "an agent that files expense reports from receipts",
    "a summarizer that turns call transcripts into CRM notes",
  ],
  not_a_request: [
    "a support chatbot that answers from our help center",
    "I need evals for a RAG search over our docs",
    "a coding agent that writes and runs tests",
  ],
};

const repoUrl = process.env.NEXT_PUBLIC_REPO_URL ?? "https://github.com/nitishmalpotra/eval-library";

function isRejectionReason(reason: unknown): reason is RejectionReason {
  return reason === "gibberish" || reason === "too_vague" || reason === "off_topic" || reason === "not_a_request" || reason === "no_match";
}

export function FindClient({ dailyLimit, patternCount }: { dailyLimit: number; patternCount: number }) {
  const searchParams = useSearchParams();
  const starterQuery = searchParams.get("q") ?? "";
  const [query, setQuery] = useState(starterQuery);
  const [remaining, setRemaining] = useState(dailyLimit);
  const [isLoading, setIsLoading] = useState(false);
  const [view, setView] = useState<View>({ kind: "idle" });
  const resultsRef = useRef<HTMLDivElement>(null);
  const queryRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setQuery(starterQuery);
  }, [starterQuery]);

  function rememberRemaining(value: unknown) {
    if (typeof value === "number" && Number.isFinite(value)) setRemaining(value);
  }

  function applyRewrite(example: string) {
    setQuery(example);
    queryRef.current?.focus();
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsLoading(true);
    setView({ kind: "idle" });

    try {
      const response = await fetch("/api/find", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query }),
      });
      const data = (await response.json()) as {
        status?: string;
        reason?: unknown;
        matches?: FindMatch[];
        remaining?: number;
        resetAt?: string;
        error?: string;
      };
      rememberRemaining(data.remaining);

      if (data.status === "limited") {
        setView({ kind: "limited", resetAt: data.resetAt ?? "" });
        return;
      }

      if (data.status === "credits_exhausted") {
        setView({ kind: "credits" });
        return;
      }

      if (!response.ok) {
        setView({ kind: "error", message: data.error ?? "Unable to find evals right now" });
        return;
      }

      if (data.status === "rejected") {
        setView({ kind: "rejected", reason: isRejectionReason(data.reason) ? data.reason : "too_vague" });
        return;
      }

      setView({ kind: "ok", matches: data.matches ?? [] });
      requestAnimationFrame(() => {
        resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    } catch {
      setView({ kind: "error", message: "Unable to find evals right now" });
    } finally {
      setIsLoading(false);
    }
  }

  const strong = view.kind === "ok" ? view.matches.filter((match) => match.fit === "strong") : [];
  const weak = view.kind === "ok" ? view.matches.filter((match) => match.fit === "weak") : [];

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
          Describe what you are building. We will surface the closest patterns from the library.
        </p>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
          {dailyLimit} searches a day on the live demo · the full library is always open.
        </p>
      </header>

      <form id="find-form" className="mt-8" onSubmit={handleSubmit}>
        <label htmlFor="query" className="sr-only">
          Describe your AI feature
        </label>
        <textarea
          ref={queryRef}
          id="query"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          rows={5}
          maxLength={1000}
          required
          className="w-full rounded-md border border-gray-300 bg-white px-4 py-3 text-slate-900 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
          placeholder="I'm building a customer support chatbot that pulls answers from a help center. What evals should I have?"
        />
        <div className="mt-4 flex items-center justify-between gap-4">
          <p aria-live="polite" className="font-mono text-xs text-slate-500 dark:text-slate-400">
            {remaining} of {dailyLimit} left today
          </p>
          <button
            type="submit"
            disabled={isLoading}
            className="rounded-md bg-blue-600 px-5 py-2.5 text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-400 dark:bg-blue-500"
          >
            {isLoading ? "Finding..." : "Find evals"}
          </button>
        </div>
      </form>

      <div ref={resultsRef} className="mt-10 space-y-6">
        {isLoading &&
          Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="h-40 animate-pulse rounded-2xl bg-slate-100 dark:bg-slate-900" />
          ))}

        {!isLoading && view.kind === "credits" && (
          <section className="my-6 rounded-lg border border-amber-200 bg-amber-50 p-6 dark:border-amber-800 dark:bg-amber-950/30">
            <p className="text-sm text-amber-700 dark:text-amber-300">DEMO LIMIT REACHED</p>
            <h2 className="mt-2 text-lg font-semibold text-slate-900 dark:text-slate-100">
              The live demo&apos;s API credits are exhausted for now.
            </h2>
            <p className="mt-3 text-slate-700 dark:text-slate-300">
              The semantic search relies on a paid API and the budget on this hosted demo has run out. The full library
              is still browseable, and you can keep using the search by self-hosting with your own API keys —
              instructions in the README take about 5 minutes.
            </p>
            <LibraryLinks patternCount={patternCount} />
          </section>
        )}

        {!isLoading && view.kind === "limited" && (
          <section className="rounded-lg border border-slate-200 bg-slate-50 p-6 dark:border-slate-800 dark:bg-slate-900/60">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
              You&apos;ve used today&apos;s {dailyLimit} searches. Thanks for exploring!
            </h2>
            {view.resetAt ? (
              <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                Searches reset {new Date(view.resetAt).toLocaleString()}.
              </p>
            ) : null}
            <div className="mt-5">
              <LibraryLinks patternCount={patternCount} />
            </div>
          </section>
        )}

        {!isLoading && view.kind === "error" && (
          <div className="flex items-center justify-between gap-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-300">
            <span>{view.message}</span>
            <button type="submit" form="find-form" className="font-medium underline underline-offset-2">
              Try again
            </button>
          </div>
        )}

        {!isLoading && view.kind === "rejected" && (
          <div className="rounded-md border border-blue-200 bg-blue-50 px-4 py-3 text-sm leading-6 text-blue-900 dark:border-blue-900/60 dark:bg-blue-950/30 dark:text-blue-200">
            <p>{rejectionMessages[view.reason]}</p>
            <div className="mt-3 flex flex-col items-start gap-2">
              {rewrites[view.reason].map((example) => (
                <button
                  key={example}
                  type="button"
                  onClick={() => applyRewrite(example)}
                  className="text-left font-medium text-blue-700 underline underline-offset-2 hover:text-blue-800 dark:text-blue-300"
                >
                  {example}
                </button>
              ))}
            </div>
          </div>
        )}

        {!isLoading && view.kind === "idle" && (
          <p className="text-sm leading-6 text-slate-500 dark:text-slate-400">
            Try: &apos;I&apos;m building an agent that books meetings on my calendar&apos; or &apos;I need evals for a
            RAG-based search over our docs.&apos;
          </p>
        )}

        {!isLoading && view.kind === "ok" && view.matches.length === 0 && (
          <div className="rounded-md border border-gray-200 bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-700 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-300">
            We understood your feature, but nothing in the library is a strong match yet.{" "}
            <Link href="/browse" className="font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400">
              Browse all {patternCount} patterns →
            </Link>
          </div>
        )}

        {!isLoading &&
          strong.map((match) => (
            <section key={match.id}>
              <p className="mb-3 italic text-slate-600 dark:text-slate-400">Why this fits: {match.rationale}</p>
              <EvalCard pattern={match.pattern} />
            </section>
          ))}

        {!isLoading && weak.length > 0 && (
          <section className="rounded-md border border-dashed border-slate-300 bg-slate-50 p-4 text-slate-500 opacity-80 dark:border-slate-700 dark:bg-slate-900/40 dark:text-slate-400">
            <h2 className="text-sm font-semibold tracking-tight text-slate-600 dark:text-slate-300">
              Margin notes: weaker matches
            </h2>
            <p className="mt-1 text-sm leading-6">
              Related, but not a direct fit. Try adding what the feature does and who uses it.
            </p>
            <div className="mt-4 space-y-6">
              {weak.map((match) => (
                <div key={match.id}>
                  <p className="mb-3 italic">Why this fits: {match.rationale}</p>
                  <EvalCard pattern={match.pattern} />
                </div>
              ))}
            </div>
          </section>
        )}
      </div>

      {!isLoading && view.kind === "ok" && view.matches.length > 0 && (
        <footer className="mt-10">
          <Link href="/browse" className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400">
            Not seeing the right pattern? Browse all {patternCount} →
          </Link>
        </footer>
      )}
    </main>
  );
}

function LibraryLinks({ patternCount }: { patternCount: number }) {
  return (
    <div className="flex flex-wrap gap-3">
      <Link
        href="/browse"
        className="rounded-md bg-blue-600 px-4 py-2.5 text-white transition hover:bg-blue-700 dark:bg-blue-500"
      >
        Browse all {patternCount} patterns →
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
  );
}
