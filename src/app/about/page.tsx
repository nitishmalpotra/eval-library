import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "About · AI PM Eval Library",
  openGraph: {
    images: ["/opengraph-image"],
  },
};

export default function AboutPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-12 text-slate-950 dark:text-slate-100">
      <div className="space-y-10">
        <Section title="What this is">
          <p className="text-slate-700 dark:text-slate-300">
            A curated, opinionated library of AI evaluation patterns extracted from Lenny Rachitsky&apos;s newsletter and podcast corpus. Built as a free, open-source reference for AI PMs.
          </p>
        </Section>

        <Section title="How patterns are extracted">
          <ol className="list-decimal space-y-2 pl-5 text-slate-700 dark:text-slate-300">
            <li>Filter Lenny&apos;s 354 newsletters and 298 podcasts to a tier-1 set explicitly about evals plus a tier-2 sweep of AI-tagged files mentioning “eval”.</li>
            <li>DeepSeek extracts structured patterns per the schema.</li>
            <li>Semantic clustering merges duplicates across operators.</li>
            <li>A manual curation pass checks quality.</li>
          </ol>
          <p className="mt-5 rounded-2xl bg-slate-50 px-5 py-4 text-sm text-slate-600 dark:bg-slate-900 dark:text-slate-400">
            354 newsletters analyzed · 298 podcasts analyzed · 73 patterns extracted · 12+ operators cited
          </p>
        </Section>

        <Section title="Schema">
          <p className="text-slate-700 dark:text-slate-300">
            Every pattern has name, one-liner, definition, explanation, when/when-not-to-use, metric, pitfalls, source citation with link, and a prompt template you can paste into any AI tool.
          </p>
        </Section>

        <Section title="Attribution">
          <p className="text-slate-700 dark:text-slate-300">
            All source content belongs to Lenny Rachitsky. This site presents extracted summaries with attribution and links back to the originals.
          </p>
          <p className="mt-4 text-slate-700 dark:text-slate-300">
            If you are Lenny: thank you for the corpus. If anything here is off or you&apos;d like it taken down, please file an issue on GitHub or email [the user can fill this in later].
          </p>
        </Section>

        <Section title="Stack">
          <p className="text-slate-700 dark:text-slate-300">
            Next.js 15, TypeScript, Tailwind v4, DeepSeek for extraction + rationale generation, OpenAI text-embedding-3-small for semantic search. Hosted on Vercel.
          </p>
        </Section>

        <Section title="Contribute">
          <p className="text-slate-700 dark:text-slate-300">
            Open a GitHub issue with the “missing pattern” or “extraction error” template.{" "}
            <a href={process.env.NEXT_PUBLIC_REPO_URL ?? "#"} className="text-blue-600 dark:text-blue-400">
              Go to GitHub
            </a>
            .
          </p>
        </Section>

        <Section title="Acknowledgments">
          <p className="text-slate-700 dark:text-slate-300">Lenny Rachitsky and every operator quoted in the library.</p>
        </Section>
      </div>
    </main>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h1 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">{title}</h1>
      <div className="mt-4 leading-7">{children}</div>
    </section>
  );
}
