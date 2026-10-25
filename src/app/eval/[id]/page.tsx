import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CategoryBadge } from "@/components/CategoryBadge";
import { DifficultyBadge } from "@/components/DifficultyBadge";
import { PromptTemplateCopier } from "@/components/PromptTemplateCopier";
import { getAllEvals, getEvalById, getSpecimenNumber } from "@/lib/evals";

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
    title: pattern?.name ?? "Pattern",
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

  const specimen = String(getSpecimenNumber(pattern.id)).padStart(2, "0");
  const sources =
    pattern.sources && pattern.sources.length > 0
      ? pattern.sources
      : [
          {
            operator: pattern.source_operator,
            title: pattern.source_title,
            date: pattern.source_date,
            url: pattern.source_url,
            publication: pattern.source_publication,
          },
        ];

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6">
      <Link href="/browse" className="text-sm text-ink underline decoration-accent underline-offset-4">
        Back to browse
      </Link>

      <div className="detail-layout mt-8">
        <article className="reading min-w-0">
          <header className="border-b border-line pb-8">
            <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-muted">No. {specimen}</p>
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <CategoryBadge category={pattern.category} />
              <DifficultyBadge difficulty={pattern.difficulty} />
              {pattern.feature_types.map((featureType) => (
                <span key={featureType} className="difficulty-chip">
                  {featureType.replaceAll("_", " ")}
                </span>
              ))}
            </div>
            <h1 className="mt-5 text-4xl tracking-tight text-ink sm:text-5xl">{pattern.name}</h1>
            <p className="mt-4 max-w-[62ch] text-lg leading-8 text-ink">{pattern.one_liner}</p>
          </header>

          <div className="space-y-10 py-10">
            <section>
              <h2 className="text-2xl tracking-tight text-ink">What it is</h2>
              <p className="mt-4 max-w-[68ch] leading-7 text-ink">{pattern.definition}</p>
              <p className="mt-4 max-w-[68ch] whitespace-pre-line leading-7 text-ink">{pattern.explanation}</p>
            </section>

            <section>
              <h2 className="text-2xl tracking-tight text-ink">Metric or method</h2>
              <p className="mt-4 max-w-[68ch] leading-7 text-ink">{pattern.metric_or_method}</p>
            </section>
          </div>
        </article>

        <aside className="marginalia">
          <MarginList title="When to use" items={pattern.when_to_use} />
          <MarginList title="When not to use" items={pattern.when_not_to_use} />
          <MarginList title="Pitfalls" items={pattern.common_pitfalls} />
        </aside>

        <div className="reading-tail">
          <div className="space-y-10">
            <section>
              <h2 className="sr-only">Source excerpt</h2>
              <blockquote className="pull-quote">
                <p>{pattern.source_excerpt}</p>
                <footer>
                  From {pattern.source_operator}
                  {pattern.source_publication ? `, ${pattern.source_publication}` : ""}
                </footer>
              </blockquote>
            </section>

            <section>
              <h2 className="text-2xl tracking-tight text-ink">Drop into your AI tool</h2>
              <div className="mt-4">
                <PromptTemplateCopier prompt={pattern.codex_prompt_template} />
              </div>
            </section>

            <section>
              <h2 className="text-2xl tracking-tight text-ink">Sources</h2>
              <ol className="footnotes mt-4">
                {sources.map((source, index) => (
                  <li key={`${source.title}-${source.date}-${index}`}>
                    {source.url ? (
                      <a href={source.url} target="_blank" rel="noopener noreferrer">
                        {source.title}
                      </a>
                    ) : (
                      source.title
                    )}
                    <span className="text-muted">
                      {" "}
                      — {source.operator}
                      {source.publication ? `, ${source.publication}` : ""}
                      {source.date ? `, ${source.date}` : ""}
                    </span>
                  </li>
                ))}
              </ol>
            </section>
          </div>

          <div className="border-t border-line pt-8">
            <Link
              href={`/find?q=${encodeURIComponent(pattern.one_liner)}`}
              className="text-sm text-ink underline decoration-accent underline-offset-4"
            >
              Find similar patterns
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}

function MarginList({ title, items }: { title: string; items: string[] }) {
  return (
    <section>
      <h2 className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink">{title}</h2>
      <ul className="mt-3 space-y-2 text-sm leading-6 text-ink">
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </section>
  );
}
