"use client";

import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import { CategoryBadge } from "@/components/CategoryBadge";
import { DifficultyBadge } from "@/components/DifficultyBadge";
import { EvalCard } from "@/components/EvalCard";
import { SourceCitation } from "@/components/SourceCitation";
import type { EvalPattern } from "@/lib/evals";

const storageKey = "eval-library-learn-progress";
const chapters = ["What is an eval?", "Four categories", "A worked example", "How to read one", "Where next"];
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
  specimenById: Record<string, number>;
};

export function LearnClient({ beginnerPattern, categoryExamples, workedExample, tourPattern, specimenById }: LearnClientProps) {
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
    <main className="mx-auto w-full max-w-3xl px-4 py-12 sm:px-6">
      <nav className="chapter-tabs" aria-label="Chapters">
        {chapters.map((title, index) => {
          const value = index + 1;
          return (
            <button
              key={title}
              type="button"
              aria-current={value === step ? "step" : undefined}
              onClick={() => setStep(value)}
              className="chapter-tab"
            >
              {value < step ? <ChapterCheck /> : null}
              {title}
            </button>
          );
        })}
      </nav>

      <section key={step} className="chapter-panel mt-8 min-w-0">
        {step === 1 && <StepOne pattern={beginnerPattern} specimenById={specimenById} />}
        {step === 2 && <StepTwo patterns={categoryExamples} specimenById={specimenById} />}
        {step === 3 && <StepThree pattern={workedExample} />}
        {step === 4 && <StepFour pattern={tourPattern} />}
        {step === 5 && <StepFive />}
      </section>

      <div className="mt-10 flex items-center justify-between border-t border-line pt-6">
        <button
          type="button"
          disabled={step === 1}
          onClick={() => setStep((current) => Math.max(1, current - 1))}
          className="border border-line px-4 py-2 text-sm text-ink disabled:cursor-not-allowed disabled:opacity-40"
        >
          Previous
        </button>
        {step < 5 ? (
          <button type="button" onClick={() => setStep((current) => Math.min(5, current + 1))} className="find-send">
            Next
          </button>
        ) : (
          <Link href="/browse" className="find-send inline-flex items-center">
            Done — go explore
          </Link>
        )}
      </div>
    </main>
  );
}

function ChapterCheck() {
  return (
    <svg className="chapter-check" viewBox="0 0 14 14" aria-hidden="true">
      <path d="M2.5 7.2 C4 8.4 5.2 10.6 5.6 11.2 C7.2 7.4 9.4 4.2 12 2.4" pathLength="1" />
    </svg>
  );
}

function StepOne({ pattern, specimenById }: { pattern: EvalPattern; specimenById: Record<string, number> }) {
  return (
    <>
      <h1 className="text-3xl tracking-tight text-ink">What is an eval?</h1>
      <div className="mt-6 space-y-4 leading-7 text-ink">
        <p>Traditional software can often be specified in prose: click this, return that, reject those inputs.</p>
        <p>AI products are different. Their outputs are probabilistic, so prose alone cannot fully describe what “good” looks like across the range of real user behavior.</p>
        <p>The eval set becomes the operational spec. In that sense, evals are the new PRD: they turn product intent into examples the whole team can build against.</p>
        <p>A single labeled example, repeated at scale, is usually more useful than five paragraphs of requirements.</p>
      </div>
      <div className="mt-8">
        <EvalCard pattern={pattern} specimen={specimenById[pattern.id] ?? 0} />
      </div>
    </>
  );
}

function StepTwo({ patterns, specimenById }: { patterns: EvalPattern[]; specimenById: Record<string, number> }) {
  return (
    <>
      <h1 className="text-3xl tracking-tight text-ink">The four eval categories</h1>
      <div className="mt-6 grid gap-5">
        {categories.map(([label, description], index) => {
          const pattern = patterns[index];
          if (!pattern) return null;
          return (
            <div key={label}>
              <p className="text-sm leading-6 text-ink">
                <span className="font-semibold">{label}:</span> {description}.
              </p>
              <div className="mt-3">
                <EvalCard pattern={pattern} specimen={specimenById[pattern.id] ?? 0} />
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}

function Annotation({ children }: { children: ReactNode }) {
  return <p className="mt-3 border-l border-accent pl-4 text-sm text-muted">{children}</p>;
}

function StepThree({ pattern }: { pattern: EvalPattern }) {
  return (
    <>
      <h1 className="text-3xl tracking-tight text-ink">Your first eval, walked through field by field</h1>
      <div className="mt-8 space-y-8">
        <section>
          <h2 className="text-xl text-ink">{pattern.name}</h2>
          <p className="mt-3 text-ink">{pattern.one_liner}</p>
          <Annotation>the elevator pitch — should make you want to read more</Annotation>
        </section>
        <section>
          <h3 className="text-lg text-ink">When to use</h3>
          <ul className="mt-3 list-disc space-y-2 pl-5 text-ink">
            {pattern.when_to_use.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
          <Annotation>the situations where you reach for this — concrete, not abstract</Annotation>
        </section>
        <section>
          <h3 className="text-lg text-ink">Source excerpt</h3>
          <blockquote className="pull-quote mt-3 text-2xl">
            <p>{pattern.source_excerpt}</p>
          </blockquote>
          <Annotation>the source of truth — every claim above must be traceable here</Annotation>
        </section>
        <section>
          <h3 className="text-lg text-ink">Prompt template</h3>
          <pre className="recipe mt-3 overflow-x-auto p-4 text-sm leading-6 text-ink">
            <code>{pattern.codex_prompt_template}</code>
          </pre>
          <Annotation>this is what makes the pattern actionable — paste it into any AI tool (Claude, ChatGPT, Cursor, Codex, etc.) and substitute the placeholders</Annotation>
        </section>
      </div>
    </>
  );
}

function StepFour({ pattern }: { pattern: EvalPattern }) {
  return (
    <>
      <h1 className="text-3xl tracking-tight text-ink">How to read any pattern</h1>
      <div className="relative mt-8 border border-line bg-card p-6">
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
        <h2 className="mt-5 text-2xl tracking-tight text-ink">{pattern.name}</h2>
        <p className="mt-3 text-ink">{pattern.one_liner}</p>
        <SourceCitation
          source_operator={pattern.source_operator}
          source_title={pattern.source_title}
          source_date={pattern.source_date}
          source_url={pattern.source_url}
        />
        <div className="space-y-4 text-sm leading-6 text-ink">
          <p>{pattern.definition}</p>
          <p>{pattern.metric_or_method}</p>
        </div>
        <pre className="recipe mt-6 overflow-x-auto p-4 text-sm leading-6 text-ink">
          <code>{pattern.codex_prompt_template}</code>
        </pre>
      </div>
      <div className="mt-5 grid gap-2 text-sm text-muted sm:grid-cols-2">
        <p>1. Badges</p>
        <p>2. Name</p>
        <p>3. One-liner</p>
        <p>4. Source citation</p>
        <p>5. Body sections</p>
        <p>6. Prompt template</p>
      </div>
    </>
  );
}

function Chip({ label, className }: { label: string; className: string }) {
  return (
    <span className={`absolute flex h-7 w-7 items-center justify-center rounded-full bg-ink text-sm text-paper ${className}`}>
      {label}
    </span>
  );
}

function StepFive() {
  return (
    <>
      <h1 className="text-3xl tracking-tight text-ink">Where to go next</h1>
      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        <NextCard title="Browse all patterns" href="/browse" queries={["rag", "beginner framework"]} />
        <NextCard
          title="Find an eval for your feature"
          href="/find"
          queries={["I’m building a support chatbot over help docs.", "I need evals for an agent that books meetings."]}
        />
      </div>
      <p className="mt-8 text-sm text-muted">
        If you spot a gap or an error, file an issue on{" "}
        <a href={process.env.NEXT_PUBLIC_REPO_URL ?? "#"} className="text-ink underline decoration-accent underline-offset-4">
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
    <div className="border border-line bg-card p-5">
      <Link href={href} className="text-lg text-ink underline decoration-accent underline-offset-4">
        {title}
      </Link>
      <div className="mt-4 space-y-2">
        {queries.map((query) => (
          <button
            key={query}
            type="button"
            onClick={() => copy(query)}
            className="block w-full border border-line px-3 py-2 text-left text-sm text-muted"
          >
            {query}
          </button>
        ))}
      </div>
    </div>
  );
}
