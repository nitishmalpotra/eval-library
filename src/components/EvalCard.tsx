import Link from "next/link";
import type { CardFields } from "@/lib/evals";

export function EvalCard({ pattern, specimen }: { pattern: CardFields; specimen: number }) {
  const number = String(specimen).padStart(2, "0");

  return (
    <Link href={`/eval/${pattern.id}`} data-category={pattern.category} className="specimen group">
      <span className="specimen-tab">{pattern.category}</span>
      <p className="font-mono text-[11px] tracking-[0.16em] text-muted">No. {number}</p>
      <h2 className="highlight mt-3 font-display text-lg font-medium leading-snug tracking-tight text-ink">{pattern.name}</h2>
      <p className="mt-2 flex-1 text-sm leading-6 text-ink">{pattern.one_liner}</p>
      <p className="mt-5 flex flex-wrap gap-x-1.5 font-mono text-[11px] leading-5 text-muted">
        <span className="text-ink">{pattern.source_operator}</span>
        {pattern.source_publication ? <span>· {pattern.source_publication}</span> : null}
        {pattern.source_date ? (
          <span className="whitespace-nowrap">
            · <time dateTime={pattern.source_date}>{pattern.source_date}</time>
          </span>
        ) : null}
      </p>
    </Link>
  );
}
