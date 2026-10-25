"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { FormEvent, KeyboardEvent, useEffect, useRef, useState } from "react";
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

const starters = [
  "A support chatbot that answers from our help center",
  "An agent that books meetings on my calendar",
  "RAG search over our internal docs",
];

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
  const atStart = !isLoading && view.kind === "idle";

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

  function onComposerKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      event.currentTarget.form?.requestSubmit();
    }
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
        const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        resultsRef.current?.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
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
    <main className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6">
      <div className={atStart ? "find-start" : ""}>
        <header className={atStart ? "text-center" : ""}>
          <Link href="/learn" className="font-mono text-[11px] uppercase tracking-[0.14em] text-muted underline decoration-accent underline-offset-4">
            New here? Read the five chapters
          </Link>
          <h1 className={`mt-4 tracking-tight text-ink ${atStart ? "mx-auto max-w-[12ch] text-4xl sm:text-5xl" : "text-3xl"}`}>
            What are you building?
          </h1>
          <p className={`mt-3 text-muted ${atStart ? "mx-auto max-w-[36ch]" : "max-w-[48ch]"}`}>
            Describe the feature. The field guide will pull the closest patterns.
          </p>
        </header>

        <form id="find-form" className={atStart ? "mx-auto mt-8 w-full max-w-2xl" : "mt-8"} onSubmit={handleSubmit}>
          <div className="find-composer">
            <label htmlFor="query" className="sr-only">
              Describe your AI feature
            </label>
            <textarea
              ref={queryRef}
              id="query"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={onComposerKeyDown}
              rows={3}
              maxLength={1000}
              required
              className="find-ruled"
              placeholder="A support chatbot that answers from our help center…"
            />
            <div className="mt-3 flex items-center justify-between gap-3">
              <p className="allowance-chip" aria-live="polite">
                {remaining} of {dailyLimit} left today
              </p>
              <button type="submit" disabled={isLoading} className="find-send">
                {isLoading ? "Finding…" : "Find evals"}
              </button>
            </div>
          </div>
        </form>

        {atStart ? (
          <div className="mx-auto mt-4 flex max-w-2xl flex-wrap justify-center gap-2">
            {starters.map((example) => (
              <button key={example} type="button" onClick={() => applyRewrite(example)} className="filter-chip">
                {example}
              </button>
            ))}
          </div>
        ) : null}
      </div>

      <div ref={resultsRef} className="mt-8 scroll-mt-24 space-y-6">
        {isLoading ? (
          <div>
            <p className="find-status" aria-hidden="true">
              <span>Reading {patternCount} patterns…</span>
              <span>Checking fit…</span>
              <span>Writing margin notes…</span>
            </p>
            <p className="sr-only" aria-live="polite">
              Reading {patternCount} patterns
            </p>
            <div className="mt-4 space-y-4">
              {Array.from({ length: 3 }, (_, index) => (
                <div key={index} className="find-ghost" aria-hidden="true">
                  <span className="find-ghost-line find-ghost-line-lg" />
                  <span className="find-ghost-line" />
                  <span className="find-ghost-line" style={{ width: "48%" }} />
                </div>
              ))}
            </div>
          </div>
        ) : null}

        {!isLoading && view.kind === "credits" && (
          <section className="border border-line bg-card p-6">
            <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-muted">Demo limit reached</p>
            <h2 className="mt-2 text-2xl tracking-tight text-ink">The live demo&apos;s API credits are exhausted for now.</h2>
            <p className="mt-3 leading-7 text-ink">
              The semantic search relies on a paid API and the budget on this hosted demo has run out. The full library is
              still browseable, and you can keep using the search by self-hosting with your own API keys — instructions in
              the README take about 5 minutes.
            </p>
            <div className="mt-5">
              <LibraryLinks patternCount={patternCount} />
            </div>
          </section>
        )}

        {!isLoading && view.kind === "limited" && (
          <section className="border border-line bg-card p-6">
            <h2 className="text-2xl tracking-tight text-ink">The notebook is full for today.</h2>
            <p className="mt-3 leading-7 text-ink">You&apos;ve used today&apos;s {dailyLimit} searches. The library stays open.</p>
            {view.resetAt ? (
              <p className="mt-2 text-sm text-muted">Searches reset {new Date(view.resetAt).toLocaleString()}.</p>
            ) : null}
            <div className="mt-5">
              <LibraryLinks patternCount={patternCount} />
            </div>
          </section>
        )}

        {!isLoading && view.kind === "error" && (
          <div className="flex items-center justify-between gap-4 border border-line border-l-accent bg-card px-4 py-3 text-sm text-ink">
            <span>{view.message}</span>
            <button type="submit" form="find-form" className="underline decoration-accent underline-offset-2">
              Try again
            </button>
          </div>
        )}

        {!isLoading && view.kind === "rejected" && (
          <div className="sticky-note">
            <p className="leading-6">{rejectionMessages[view.reason]}</p>
            <div className="mt-3">
              {rewrites[view.reason].map((example) => (
                <button key={example} type="button" onClick={() => applyRewrite(example)} className="sticky-note-rewrite">
                  {example}
                </button>
              ))}
            </div>
          </div>
        )}

        {!isLoading && view.kind === "ok" && view.matches.length === 0 && (
          <div className="border border-dashed border-line px-4 py-4 text-sm leading-6 text-muted">
            We understood your feature, but nothing in the library is a strong match yet.{" "}
            <Link href="/browse" className="text-ink underline decoration-accent underline-offset-4">
              Browse all {patternCount} patterns
            </Link>
          </div>
        )}

        {!isLoading && strong.length > 0 ? (
          <div className="stagger space-y-6">
            {strong.map((match, index) => (
              <section key={match.id} className="reveal" style={{ ["--i" as string]: index }}>
                <p className="mb-3 text-sm italic text-muted">Why this fits: {match.rationale}</p>
                <EvalCard pattern={match.pattern} specimen={match.specimen} />
              </section>
            ))}
          </div>
        ) : null}

        {!isLoading && weak.length > 0 && (
          <section className="find-weak">
            <h2 className="text-sm tracking-tight text-ink">Margin notes: weaker matches</h2>
            <p className="mt-1 text-sm leading-6">Related, but not a direct fit. Try adding what the feature does and who uses it.</p>
            <div className="mt-4 space-y-6">
              {weak.map((match) => (
                <div key={match.id}>
                  <p className="mb-3 text-sm italic">Why this fits: {match.rationale}</p>
                  <EvalCard pattern={match.pattern} specimen={match.specimen} />
                </div>
              ))}
            </div>
          </section>
        )}
      </div>

      {!isLoading && view.kind === "ok" && view.matches.length > 0 && (
        <footer className="mt-10">
          <Link href="/browse" className="text-sm text-ink underline decoration-accent underline-offset-4">
            Not seeing the right pattern? Browse all {patternCount}
          </Link>
        </footer>
      )}
    </main>
  );
}

function LibraryLinks({ patternCount }: { patternCount: number }) {
  return (
    <div className="flex flex-wrap gap-3">
      <Link href="/browse" className="find-send inline-flex items-center">
        Browse all {patternCount} patterns
      </Link>
      <a
        href={`${repoUrl}#quickstart`}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center border border-line bg-card px-4 py-2 text-sm text-ink"
      >
        Self-host with your own keys
      </a>
    </div>
  );
}
