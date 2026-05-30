import Link from "next/link";
import type { Metadata } from "next";
import { EvalCard } from "@/components/EvalCard";
import { getAllEvals } from "@/lib/evals";

export const metadata: Metadata = {
  title: "AI PM Eval Library",
  description: "Every AI eval pattern from Lenny's operators, made buildable.",
  openGraph: {
    images: ["/opengraph-image"],
  },
};

const entryPoints = [
  {
    title: "Browse all patterns",
    description: "Scan the full library by feature type, difficulty, and method.",
    href: "/browse",
  },
  {
    title: "Find an eval for your feature",
    description: "Describe what you are building and jump to the closest patterns.",
    href: "/find",
  },
  {
    title: "Learn the basics",
    description: "Build the vocabulary before you start choosing evals.",
    href: "/learn",
  },
];

export default function Home() {
  const recentPatterns = [...getAllEvals()]
    .sort((a, b) => b.source_date.localeCompare(a.source_date))
    .slice(0, 4);
  const lastUpdated = new Date().toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  return (
    <div className="bg-white text-slate-950 dark:bg-slate-950 dark:text-slate-100">
      <main className="mx-auto max-w-6xl px-6 py-14 sm:py-20">
        <section className="max-w-3xl">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
            <p className="font-mono text-xs uppercase tracking-[0.18em] text-blue-600 dark:text-blue-400">Lenny&apos;s operators</p>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-[11px] font-medium text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" aria-hidden />
              Updated {lastUpdated}
            </span>
          </div>
          <h1 className="mt-4 text-4xl font-semibold tracking-tight text-slate-900 dark:text-slate-100 sm:text-6xl">
            The AI PM Eval Library
          </h1>
          <p className="mt-6 text-xl leading-8 text-slate-700 dark:text-slate-300">
            Every AI eval pattern from Lenny&apos;s operators, made buildable.
          </p>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-500 dark:text-slate-400">
            Browse practical eval patterns, understand when to use them, and copy a ready-to-adapt prompt into your workflow.
          </p>
          <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">
            Built from Lenny Rachitsky&apos;s public newsletter and podcast corpus.
          </p>
        </section>

        <section className="mt-12 grid gap-4 md:grid-cols-3">
          {entryPoints.map((entryPoint) => (
            <Link
              key={entryPoint.title}
              href={entryPoint.href}
              className="rounded-2xl border border-slate-200 bg-white p-6 transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:hover:border-slate-700 dark:hover:shadow-slate-950/40"
            >
              <h2 className="text-xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">{entryPoint.title}</h2>
              <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-400">{entryPoint.description}</p>
            </Link>
          ))}
        </section>

        <section className="mt-16">
          <div className="mb-5 flex items-center justify-between">
            <h2 className="font-mono text-xs uppercase tracking-[0.18em] text-slate-500">Recently added</h2>
            <Link href="/browse" className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400">
              View all
            </Link>
          </div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {recentPatterns.map((pattern) => (
              <EvalCard key={pattern.id} pattern={pattern} />
            ))}
          </div>
        </section>
      </main>

    </div>
  );
}
