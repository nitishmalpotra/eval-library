"use client";

import type { ReactNode } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { categories, difficulties } from "@/lib/taxonomy";
import { FeatureTypeFilter } from "./FeatureTypeFilter";

export function BrowseFilters({ publications }: { publications: string[] }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const selectedCategories = new Set(searchParams.get("cat")?.split(",").filter(Boolean) ?? []);
  const difficulty = searchParams.get("difficulty") ?? "";
  const publication = searchParams.get("pub") ?? "";
  const query = searchParams.get("q") ?? "";

  function updateParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());

    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }

    router.push(`/browse${params.toString() ? `?${params.toString()}` : ""}`);
  }

  function toggleCategory(category: string) {
    const next = new Set(selectedCategories);

    if (next.has(category)) {
      next.delete(category);
    } else {
      next.add(category);
    }

    updateParam("cat", Array.from(next).join(","));
  }

  return (
    <div className="space-y-8">
      <label className="block">
        <span className="mb-2 block font-mono text-[11px] uppercase tracking-[0.14em] text-muted">Keyword</span>
        <input
          value={query}
          onChange={(event) => updateParam("q", event.target.value)}
          placeholder="Search patterns"
          className="w-full border border-line bg-card px-3 py-2 text-sm text-ink outline-none placeholder:text-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        />
      </label>

      <FilterGroup title="Feature type">
        <FeatureTypeFilter />
      </FilterGroup>

      <FilterGroup title="Publication">
        <div className="flex flex-wrap gap-2">
          {publications.map((name) => (
            <button
              key={name}
              type="button"
              aria-pressed={publication === name}
              onClick={() => updateParam("pub", publication === name ? "" : name)}
              className="filter-chip"
            >
              {name}
            </button>
          ))}
        </div>
      </FilterGroup>

      <FilterGroup title="Difficulty">
        <div className="flex flex-wrap gap-2">
          <button type="button" aria-pressed={!difficulty} onClick={() => updateParam("difficulty", "")} className="filter-chip">
            All
          </button>
          {difficulties.map((item) => (
            <button
              key={item}
              type="button"
              aria-pressed={difficulty === item}
              onClick={() => updateParam("difficulty", difficulty === item ? "" : item)}
              className="filter-chip"
            >
              {item}
            </button>
          ))}
        </div>
      </FilterGroup>

      <FilterGroup title="Category">
        <div className="flex flex-wrap gap-2">
          {categories.map((category) => (
            <button
              key={category}
              type="button"
              aria-pressed={selectedCategories.has(category)}
              onClick={() => toggleCategory(category)}
              className="filter-chip"
            >
              {category}
            </button>
          ))}
        </div>
      </FilterGroup>
    </div>
  );
}

function FilterGroup({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <h2 className="mb-3 font-mono text-[11px] uppercase tracking-[0.14em] text-muted">{title}</h2>
      {children}
    </section>
  );
}
