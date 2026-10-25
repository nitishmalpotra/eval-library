import Link from "next/link";
import type { CSSProperties } from "react";
import type { Metadata } from "next";
import { EvalCard } from "@/components/EvalCard";
import { getAllEvals, getSpecimenNumber } from "@/lib/evals";
import { formatGeneratedAt, getHeroStats, getLibraryGeneratedAt, getPublicationStrip, getSourcesLine } from "@/lib/fieldGuide";

const title = "The AI Eval Field Guide";
const description = "Eval patterns from the people who ship AI, sourced, cited, and ready to use.";

export const metadata: Metadata = {
  title,
  description,
  openGraph: {
    images: ["/opengraph-image"],
  },
};

const entryPoints = [
  {
    tab: "Browse",
    title: "Browse all patterns",
    description: "Scan the full library by feature type, difficulty, and method.",
    href: "/browse",
  },
  {
    tab: "Find",
    title: "Find an eval for your feature",
    description: "Describe what you are building and jump to the closest patterns.",
    href: "/find",
  },
  {
    tab: "Learn",
    title: "Learn the basics",
    description: "Build the vocabulary before you start choosing evals.",
    href: "/learn",
  },
];

export default function Home() {
  const generatedAt = getLibraryGeneratedAt();
  const recentPatterns = [...getAllEvals()]
    .sort((left, right) => {
      if (!left.source_date && !right.source_date) return left.id.localeCompare(right.id);
      if (!left.source_date) return 1;
      if (!right.source_date) return -1;
      return right.source_date.localeCompare(left.source_date) || left.id.localeCompare(right.id);
    })
    .slice(0, 4);
  const stats = getHeroStats();
  const sourcesLine = getSourcesLine();
  const publications = getPublicationStrip();

  return (
    <main className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-20">
      <section className="reveal max-w-3xl border-l-2 border-accent pl-5 sm:pl-8">
        <p className="inline-flex items-center gap-2 rounded-full border border-line bg-card px-2.5 py-1 font-mono text-[11px] uppercase tracking-[0.16em] text-muted">
          <span className="h-1.5 w-1.5 rounded-full bg-accent" aria-hidden />
          <time dateTime={generatedAt}>Updated {formatGeneratedAt(generatedAt)}</time>
        </p>
        <h1 className="mt-5 max-w-[12ch] text-[2.5rem] font-medium leading-[1.05] tracking-[-0.02em] text-balance text-ink sm:text-[3.5rem]">
          {title}
        </h1>
        <p className="mt-6 max-w-2xl font-display text-xl leading-snug text-ink sm:text-2xl">
          Eval patterns from the people who ship AI, sourced, cited, and <DrawUnderline>ready to use</DrawUnderline>.
        </p>
        <p className="mt-4 max-w-2xl font-mono text-xs leading-5 text-muted sm:text-sm">{sourcesLine}</p>
      </section>

      <dl className="mt-12 grid grid-cols-2 gap-px bg-line sm:grid-cols-4">
        {stats.map((stat) => (
          <div key={stat.label} className="bg-paper px-4 py-5 sm:px-6">
            <dt className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted">{stat.label}</dt>
            <dd className="mt-2 font-display text-4xl leading-none text-ink sm:text-5xl">
              <StatValue value={stat.value} />
            </dd>
          </div>
        ))}
      </dl>

      <section className="mt-8 grid gap-x-4 sm:grid-cols-3">
        {entryPoints.map((entryPoint) => (
          <Link key={entryPoint.href} href={entryPoint.href} className="notebook-tab">
            <span className="notebook-tab-label">{entryPoint.tab}</span>
            <h2 className="text-2xl font-medium leading-tight tracking-tight text-ink">{entryPoint.title}</h2>
            <p className="mt-3 text-sm leading-6 text-muted">{entryPoint.description}</p>
          </Link>
        ))}
      </section>

      <section className="mt-16">
        <div className="flex items-end justify-between gap-4">
          <h2 className="font-mono text-[11px] font-normal uppercase tracking-[0.18em] text-muted">Recently added</h2>
          <Link href="/browse" className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink underline decoration-accent underline-offset-4">
            View all
          </Link>
        </div>
        <div className="stagger mt-2 grid gap-x-4 gap-y-2 pt-2 sm:grid-cols-2 xl:grid-cols-4">
          {recentPatterns.map((pattern, index) => (
            <div key={pattern.id} className="reveal min-w-0" style={{ "--i": index } as CSSProperties}>
              <EvalCard pattern={pattern} specimen={getSpecimenNumber(pattern.id)} />
            </div>
          ))}
        </div>
      </section>

      <section className="reveal-mount mt-16 border-t border-line pt-8">
        <h2 className="font-mono text-[11px] font-normal uppercase tracking-[0.18em] text-muted">Sources</h2>
        <p className="mt-3 max-w-3xl font-mono text-sm leading-6 text-ink">{publications.join(" · ")}</p>
      </section>
    </main>
  );
}

function DrawUnderline({ children }: { children: React.ReactNode }) {
  return (
    <span className="draw">
      {children}
      <svg viewBox="0 0 120 8" aria-hidden="true" preserveAspectRatio="none">
        <path
          pathLength="1"
          d="M1 5.2C14 2.4 22 7 38 4.4C54 1.8 66 6.6 82 4.2C98 1.6 108 6.2 119 3.8"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
    </span>
  );
}

function StatValue({ value }: { value: number }) {
  return (
    <span className="stat-count" style={{ "--end": value } as CSSProperties}>
      <span className="stat-count-value">{value.toLocaleString("en-US")}</span>
    </span>
  );
}
