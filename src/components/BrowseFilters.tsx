"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { categories, difficulties } from "@/lib/evals";
import { FeatureTypeFilter } from "./FeatureTypeFilter";

export function BrowseFilters() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const selectedCategories = new Set(searchParams.get("cat")?.split(",").filter(Boolean) ?? []);
  const difficulty = searchParams.get("difficulty") ?? "";
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
        <span className="mb-2 block font-mono text-xs uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
          Keyword
        </span>
        <input
          value={query}
          onChange={(event) => updateParam("q", event.target.value)}
          placeholder="Search patterns"
          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100"
        />
      </label>

      <section>
        <h2 className="mb-3 font-mono text-xs uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
          Feature type
        </h2>
        <FeatureTypeFilter />
      </section>

      <section>
        <h2 className="mb-3 font-mono text-xs uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
          Difficulty
        </h2>
        <div className="space-y-2">
          <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
            <input
              type="radio"
              name="difficulty"
              checked={!difficulty}
              onChange={() => updateParam("difficulty", "")}
            />
            All
          </label>
          {difficulties.map((item) => (
            <label key={item} className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
              <input
                type="radio"
                name="difficulty"
                checked={difficulty === item}
                onChange={() => updateParam("difficulty", item)}
              />
              {item}
            </label>
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-3 font-mono text-xs uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
          Category
        </h2>
        <div className="space-y-2">
          {categories.map((category) => (
            <label key={category} className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
              <input
                type="checkbox"
                checked={selectedCategories.has(category)}
                onChange={() => toggleCategory(category)}
              />
              {category}
            </label>
          ))}
        </div>
      </section>
    </div>
  );
}
