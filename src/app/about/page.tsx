import type { ReactNode } from "react";
import type { Metadata } from "next";
import { formatGeneratedAt, getLibraryFacts } from "@/lib/fieldGuide";
import { getSearchEvalHeadline } from "@/lib/searchEval";

export const metadata: Metadata = {
  title: "About",
  openGraph: {
    images: ["/opengraph-image"],
  },
};

const repoUrl = process.env.NEXT_PUBLIC_REPO_URL ?? "https://github.com/nitishmalpotra/eval-library";

export default function AboutPage() {
  const facts = getLibraryFacts();
  const searchEval = getSearchEvalHeadline();
  const publicationNames = facts.publications.map((publication) => publication.name);

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-12 sm:px-6">
      <h1 className="text-4xl tracking-tight text-ink">About</h1>
      <div className="mt-10 space-y-10">
        <Section title="What this is">
          <p>
            A field guide of AI evaluation patterns, drawn from people who ship AI products and cited back to the source.
            Free, and open source.
          </p>
        </Section>

        <Section title="How patterns are extracted">
          <ol className="list-decimal space-y-2 pl-5">
            <li>Score every file in the corpus for whether it is about evaluating AI products.</li>
            <li>Extract structured patterns from the files that qualify.</li>
            <li>Cluster and merge duplicates across operators and publications.</li>
            <li>Tighten the one-liners, prompts, and explanations.</li>
          </ol>
          <dl className="mt-5 grid grid-cols-2 gap-px border border-line bg-line sm:grid-cols-4">
            <Fact label="Files scanned" value={facts.filesScanned} />
            <Fact label="Files selected" value={facts.filesSelected} />
            <Fact label="Patterns" value={facts.patternCount} />
            <Fact label="Operators" value={facts.operatorCount} />
          </dl>
          <ul className="mt-4 space-y-1 text-sm text-muted">
            {facts.publications.map((publication) => (
              <li key={publication.name}>
                {publication.name}: {publication.files} {publication.files === 1 ? "file" : "files"}
              </li>
            ))}
          </ul>
        </Section>

        <Section title="Schema">
          <p>
            Every pattern has a name, one-liner, definition, explanation, when to use it, when not to, a metric, pitfalls,
            a source citation with a link, and a prompt you can paste into an AI tool.
          </p>
        </Section>

        <Section title="How we eval our own search">
          <p>
            The finder is scored against a labeled set
            {searchEval.generated ? ` (${formatGeneratedAt(searchEval.generated)})` : ""}. These are the headline numbers
            from that run
            {searchEval.embeddingModel ? `, using ${searchEval.embeddingModel}` : ""}.
          </p>
          <ul className="mt-4 space-y-2">
            {searchEval.gates.map((gate) => (
              <li key={gate.metric}>
                <span className="font-medium text-ink">{gate.metric}:</span> {gate.value}{" "}
                <span className="text-muted">target {gate.target}</span>
              </li>
            ))}
          </ul>
          {searchEval.report.length > 0 ? (
            <ul className="mt-4 space-y-2 text-sm text-muted">
              {searchEval.report.map((row) => (
                <li key={row.metric}>
                  {row.metric}: {row.value}
                </li>
              ))}
            </ul>
          ) : null}
          <p className="mt-4 text-sm text-muted">
            {searchEval.latencyP50 ? `Median latency ${searchEval.latencyP50}. ` : ""}
            {searchEval.cost ? `Run cost ${searchEval.cost}. ` : ""}
            <a href={`${repoUrl}/blob/main/data/search-evals.json`} className="text-ink underline decoration-accent underline-offset-4">
              Labeled cases
            </a>
          </p>
        </Section>

        <Section title="Attribution">
          <p>
            All source content belongs to its respective creators
            {publicationNames.length > 0 ? `: ${publicationNames.join(", ")}` : ""}. This site presents extracted
            summaries with attribution and links back to the originals.
          </p>
        </Section>

        <Section title="Stack">
          <p>
            Next.js 15, TypeScript, and Tailwind v4. OpenRouter runs extraction and the finder
            {searchEval.embeddingModel ? `; search embeddings are ${searchEval.embeddingModel}` : ""}. Hosted on Vercel.
          </p>
        </Section>

        <Section title="Contribute">
          <p>
            The repository is open. Corrections and missing patterns are welcome on{" "}
            <a href={repoUrl} className="text-ink underline decoration-accent underline-offset-4">
              GitHub
            </a>
            .
          </p>
        </Section>

        <Section title="Acknowledgments">
          <p>The operators quoted in the library, and the publications they spoke through.</p>
        </Section>
      </div>
    </main>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <h2 className="text-2xl tracking-tight text-ink">{title}</h2>
      <div className="mt-4 leading-7 text-ink">{children}</div>
    </section>
  );
}

function Fact({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-card px-3 py-3">
      <dt className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted">{label}</dt>
      <dd className="mt-1 font-display text-2xl text-ink">{value}</dd>
    </div>
  );
}
