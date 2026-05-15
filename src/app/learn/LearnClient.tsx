"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { CategoryBadge } from "@/components/CategoryBadge";
import { DifficultyBadge } from "@/components/DifficultyBadge";
import { EvalCard } from "@/components/EvalCard";
import { SourceCitation } from "@/components/SourceCitation";
import type { EvalPattern } from "@/lib/evals";

const storageKey = "eval-library-learn-progress";
const categories = [
  ["METHODOLOGY", "a named technique you can apply"],
  ["METRIC", "a number you measure"],
  ["PROCESS", "a workflow you run"],
  ["FRAMEWORK", "a way to think about the whole problem"],
] as const;

type LearnClientProps = {
  beginnerPattern: EvalPattern;
  categoryExamples: EvalPattern[];
  workedExample: EvalPattern;
  tourPattern: EvalPattern;
};

export function LearnClient({ beginnerPattern, categoryExamples, workedExample, tourPattern }: LearnClientProps) {
  const [step, setStep] = useState(1);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const saved = Number(window.localStorage.getItem(storageKey));
    if (saved >= 1 && saved <= 5) {
      setStep(saved);
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (hydrated) {
      window.localStorage.setItem(storageKey, String(step));
    }
  }, [hydrated, step]);

  return (
    <main className="mx-auto max-w-3xl px-6 py-12 text-slate-950 dark:text-slate-100">
      <div className="flex items-center gap-3">
        {Array.from({ length: 5 }, (_, index) => {
          const value = index + 1;
          return (
            <button
              key={value}
              type="button"
              aria-label={`Go to step ${value}`}
              onClick={() => setStep(value)}
              className={`h-3 w-3 rounded-full border transition ${
                value <= step
                  ? "border-blue-600 bg-blue-600"
                  : "border-slate-300 bg-transparent dark:border-slate-700"
              }`}
            />
          );
        })}
      </div>

      <section key={step} className="mt-8 transition duration-200 ease-out motion-safe:animate-[fadeIn_.2s_ease-out]">
        {step === 1 && <StepOne pattern={beginnerPattern} />}
        {step === 2 && <StepTwo patterns={categoryExamples} />}
        {step === 3 && <StepThree pattern={workedExample} />}
        {step === 4 && <StepFour pattern={tourPattern} />}
        {step === 5 && <StepFive />}
      </section>

      <div className="mt-10 flex items-center justify-between border-t border-slate-200 pt-6 dark:border-slate-800">
        <button
          type="button"
          disabled={step === 1}
          onClick={() => setStep((current) => Math.max(1, current - 1))}
          className="rounded-md border border-gray-300 px-4 py-2 text-sm text-slate-700 transition hover:border-slate-400 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700 dark:text-slate-300"
        >
          Previous
        </button>
        {step < 5 ? (
          <button
            type="button"
            onClick={() => setStep((current) => Math.min(5, current + 1))}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm text-white transition hover:bg-blue-700 dark:bg-blue-500"
          >
            Next
          </button>
        ) : (
          <Link href="/browse" className="rounded-md bg-blue-600 px-4 py-2 text-sm text-white transition hover:bg-blue-700 dark:bg-blue-500">
            Done — go explore
          </Link>
        )}
      </div>
    </main>
  );
}

function StepOne({ pattern }: { pattern: EvalPattern }) {
  return (
    <>
      <h1 className="text-3xl font-semibold tracking-tight">What is an eval?</h1>
      <div className="mt-6 space-y-4 leading-7 text-slate-700 dark:text-slate-300">
        <p>Traditional software can often be specified in prose: click this, return that, reject those inputs.</p>
        <p>AI products are different. Their outputs are probabilistic, so prose alone cannot fully describe what “good” looks like across the range of real user behavior.</p>
        <p>The eval set becomes the operational spec. In that sense, evals are the new PRD: they turn product intent into examples the whole team can build against.</p>
        <p>A single labeled example, repeated at scale, is usually more useful than five paragraphs of requirements.</p>
      </div>
      <div className="mt-8">
        <EvalCard pattern={pattern} />
      </div>
    </>
  );
}

function StepTwo({ patterns }: { patterns: EvalPattern[] }) {
  return (
    <>
      <h1 className="text-3xl font-semibold tracking-tight">The four eval categories</h1>
      <div className="mt-6 grid gap-5">
        {categories.map(([label, description], index) => (
          <div key={label}>
            <p className="text-sm leading-6 text-slate-700 dark:text-slate-300">
              <span className="font-semibold">{label}:</span> {description}.
            </p>
            <div className="mt-3">
              <EvalCard pattern={patterns[index]} />
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

function Annotation({ children }: { children: React.ReactNode }) {
  return <p className="mt-3 border-l border-slate-200 pl-4 text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">{children}</p>;
}

function StepThree({ pattern }: { pattern: EvalPattern }) {
  return (
    <>
      <h1 className="text-3xl font-semibold tracking-tight">Your first eval, walked through field by field</h1>
      <div className="mt-8 space-y-8">
        <section>
          <h2 className="text-xl font-semibold">{pattern.name}</h2>
          <p className="mt-3 text-slate-700 dark:text-slate-300">{pattern.one_liner}</p>
          <Annotation>the elevator pitch — should make you want to read more</Annotation>
        </section>
        <section>
          <h3 className="text-lg font-semibold">When to use</h3>
          <ul className="mt-3 list-disc space-y-2 pl-5 text-slate-700 dark:text-slate-300">
            {pattern.when_to_use.map((item) => <li key={item}>{item}</li>)}
          </ul>
          <Annotation>the situations where you reach for this — concrete, not abstract</Annotation>
        </section>
        <section>
          <h3 className="text-lg font-semibold">Source excerpt</h3>
          <blockquote className="mt-3 border-l-2 border-slate-200 pl-5 text-sm leading-7 text-slate-600 dark:border-slate-700 dark:text-slate-300">
            {pattern.source_excerpt}
          </blockquote>
          <Annotation>the source of truth — every claim above must be traceable here</Annotation>
        </section>
        <section>
          <h3 className="text-lg font-semibold">Codex prompt</h3>
          <pre className="mt-3 overflow-x-auto rounded-2xl bg-slate-900 p-4 text-sm leading-6 text-slate-100 dark:bg-slate-950">
            <code>{pattern.codex_prompt_template}</code>
          </pre>
          <Annotation>this is what makes the pattern actionable — paste it into Codex/Cursor and substitute the placeholders</Annotation>
        </section>
      </div>
    </>
  );
}

function StepFour({ pattern }: { pattern: EvalPattern }) {
  return (
    <>
      <h1 className="text-3xl font-semibold tracking-tight">How to read any pattern</h1>
      <div className="relative mt-8 rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
        <Chip label="1" className="left-3 top-3" />
        <Chip label="2" className="right-5 top-20" />
        <Chip label="3" className="left-3 top-36" />
        <Chip label="4" className="right-5 top-52" />
        <Chip label="5" className="left-3 bottom-28" />
        <Chip label="6" className="right-5 bottom-5" />
        <div className="flex flex-wrap gap-2 pl-7">
          <CategoryBadge category={pattern.category} />
          <DifficultyBadge difficulty={pattern.difficulty} />
        </div>
        <h2 className="mt-5 text-2xl font-semibold tracking-tight">{pattern.name}</h2>
        <p className="mt-3 text-slate-700 dark:text-slate-300">{pattern.one_liner}</p>
        <SourceCitation
          source_operator={pattern.source_operator}
          source_title={pattern.source_title}
          source_date={pattern.source_date}
          source_url={pattern.source_url}
        />
        <div className="space-y-4 text-sm leading-6 text-slate-700 dark:text-slate-300">
          <p>{pattern.definition}</p>
          <p>{pattern.metric_or_method}</p>
        </div>
        <pre className="mt-6 overflow-x-auto rounded-2xl bg-slate-900 p-4 text-sm leading-6 text-slate-100 dark:bg-slate-950">
          <code>{pattern.codex_prompt_template}</code>
        </pre>
      </div>
      <div className="mt-5 grid gap-2 text-sm text-slate-600 dark:text-slate-400 sm:grid-cols-2">
        <p>1. Badges</p>
        <p>2. Name</p>
        <p>3. One-liner</p>
        <p>4. Source citation</p>
        <p>5. Body sections</p>
        <p>6. Codex prompt</p>
      </div>
    </>
  );
}

function Chip({ label, className }: { label: string; className: string }) {
  return <span className={`absolute flex h-7 w-7 items-center justify-center rounded-full bg-blue-600 text-sm font-semibold text-white ${className}`}>{label}</span>;
}

function StepFive() {
  return (
    <>
      <h1 className="text-3xl font-semibold tracking-tight">Where to go next</h1>
      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        <NextCard
          title="Browse all patterns"
          href="/browse"
          queries={["rag", "beginner framework"]}
        />
        <NextCard
          title="Find an eval for your feature"
          href="/find"
          queries={["I’m building a support chatbot over help docs.", "I need evals for an agent that books meetings."]}
        />
      </div>
      <p className="mt-8 text-sm text-slate-600 dark:text-slate-400">
        If you spot a gap or an error, file an issue on{" "}
        <a href={process.env.NEXT_PUBLIC_REPO_URL ?? "#"} className="text-blue-600 dark:text-blue-400">
          GitHub
        </a>
        .
      </p>
    </>
  );
}

function NextCard({ title, href, queries }: { title: string; href: string; queries: string[] }) {
  async function copy(query: string) {
    await navigator.clipboard.writeText(query);
  }

  return (
    <div className="rounded-2xl border border-slate-200 p-5 dark:border-slate-800 dark:bg-slate-900">
      <Link href={href} className="text-lg font-semibold text-blue-600 dark:text-blue-400">
        {title}
      </Link>
      <div className="mt-4 space-y-2">
        {queries.map((query) => (
          <button
            key={query}
            type="button"
            onClick={() => copy(query)}
            className="block w-full rounded-lg border border-slate-200 px-3 py-2 text-left text-sm text-slate-600 transition hover:border-slate-300 dark:border-slate-700 dark:text-slate-300 dark:hover:border-slate-600"
          >
            {query}
          </button>
        ))}
      </div>
    </div>
  );
}
