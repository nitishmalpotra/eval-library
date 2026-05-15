import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CategoryBadge } from "@/components/CategoryBadge";
import { CodexPromptCopier } from "@/components/CodexPromptCopier";
import { DifficultyBadge } from "@/components/DifficultyBadge";
import { SourceCitation } from "@/components/SourceCitation";
import { getAllEvals, getEvalById } from "@/lib/evals";

type EvalDetailPageProps = {
  params: Promise<{ id: string }>;
};

export function generateStaticParams() {
  return getAllEvals().map((pattern) => ({ id: pattern.id }));
}

export async function generateMetadata({ params }: EvalDetailPageProps): Promise<Metadata> {
  const { id } = await params;
  const pattern = getEvalById(id);

  return {
    title: pattern ? `${pattern.name} · AI PM Eval Library` : "AI PM Eval Library",
    description: pattern?.one_liner,
    openGraph: {
      images: ["/opengraph-image"],
    },
  };
}

export default async function EvalDetailPage({ params }: EvalDetailPageProps) {
  const { id } = await params;
  const pattern = getEvalById(id);

  if (!pattern) {
    notFound();
  }

  return (
    <main className="mx-auto max-w-[720px] px-6 py-10 text-slate-950 dark:text-slate-100">
      <Link href="/browse" className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400">
        ← Back to Browse
      </Link>

      <header className="mt-8 border-b border-slate-200 pb-8 dark:border-slate-800">
        <div className="flex flex-wrap gap-2">
          <CategoryBadge category={pattern.category} />
          <DifficultyBadge difficulty={pattern.difficulty} />
          {pattern.feature_types.map((featureType) => (
            <span
              key={featureType}
              className="inline-flex rounded-full bg-blue-50 px-2.5 py-1 font-mono text-[11px] uppercase tracking-[0.16em] text-blue-700 dark:bg-blue-950/40 dark:text-blue-300"
            >
              {featureType}
            </span>
          ))}
        </div>
        <h1 className="mt-5 text-4xl font-semibold tracking-tight">{pattern.name}</h1>
        <p className="mt-4 text-lg leading-8 text-slate-700 dark:text-slate-300">{pattern.one_liner}</p>
        <div className="mt-5">
          <SourceCitation
            source_operator={pattern.source_operator}
            source_title={pattern.source_title}
            source_date={pattern.source_date}
            source_url={pattern.source_url}
          />
        </div>
      </header>

      <article className="space-y-10 py-10">
        <section>
          <h2 className="text-xl font-semibold tracking-tight">What it is</h2>
          <p className="mt-4 leading-7 text-slate-700 dark:text-slate-300">{pattern.definition}</p>
          <p className="mt-4 whitespace-pre-line leading-7 text-slate-700 dark:text-slate-300">{pattern.explanation}</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold tracking-tight">When to use</h2>
          <ul className="mt-4 list-disc space-y-2 pl-5 leading-7 text-slate-700 dark:text-slate-300">
            {pattern.when_to_use.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold tracking-tight">When NOT to use</h2>
          <ul className="mt-4 list-disc space-y-2 pl-5 leading-7 text-slate-700 dark:text-slate-300">
            {pattern.when_not_to_use.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold tracking-tight">Metric or method</h2>
          <p className="mt-4 leading-7 text-slate-700 dark:text-slate-300">{pattern.metric_or_method}</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold tracking-tight">Common pitfalls</h2>
          <ul className="mt-4 list-disc space-y-2 pl-5 leading-7 text-slate-700 dark:text-slate-300">
            {pattern.common_pitfalls.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold tracking-tight">Source excerpt</h2>
          <blockquote className="mt-4 border-l-2 border-slate-200 pl-5 text-sm leading-7 text-slate-600 dark:border-slate-700 dark:text-slate-300">
            {pattern.source_excerpt}
          </blockquote>
        </section>

        <section>
          <h2 className="text-xl font-semibold tracking-tight">Drop into Codex</h2>
          <div className="mt-4">
            <CodexPromptCopier prompt={pattern.codex_prompt_template} />
          </div>
        </section>

        <section>
          <h2 className="text-xl font-semibold tracking-tight">All sources</h2>
          <div className="mt-4">
            <SourceCitation
              source_operator={pattern.source_operator}
              source_title={pattern.source_title}
              source_date={pattern.source_date}
              source_url={pattern.source_url}
              compact
            />
          </div>
        </section>
      </article>

      <div className="border-t border-slate-200 pt-8 dark:border-slate-800">
        <Link href={`/find?q=${encodeURIComponent(pattern.one_liner)}`} className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400">
          Find similar patterns →
        </Link>
      </div>
    </main>
  );
}
