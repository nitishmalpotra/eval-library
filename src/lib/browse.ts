import type { EvalPattern } from "./evals";

export type BrowseQuery = {
  query: string;
  featureTypes: string[];
  categories: string[];
  difficulty: string;
  publication: string;
};

export function listPublications(patterns: EvalPattern[]) {
  const names = new Set<string>();

  for (const pattern of patterns) {
    for (const name of publicationsFor(pattern)) names.add(name);
  }

  return [...names].sort((left, right) => left.localeCompare(right));
}

export function filterPatterns(patterns: EvalPattern[], filters: BrowseQuery) {
  const query = filters.query.trim().toLowerCase();

  return patterns.filter((pattern) => {
    const matchesFeatureType =
      filters.featureTypes.length === 0 ||
      filters.featureTypes.some((featureType) => (pattern.feature_types as readonly string[]).includes(featureType));
    const matchesCategory = filters.categories.length === 0 || filters.categories.includes(pattern.category);
    const matchesDifficulty = !filters.difficulty || pattern.difficulty === filters.difficulty;
    const matchesPublication = !filters.publication || publicationsFor(pattern).has(filters.publication);
    const haystack = [pattern.name, pattern.one_liner, pattern.definition, pattern.explanation, ...pattern.keywords]
      .join(" ")
      .toLowerCase();

    return matchesFeatureType && matchesCategory && matchesDifficulty && matchesPublication && (!query || haystack.includes(query));
  });
}

function publicationsFor(pattern: EvalPattern) {
  const names = new Set<string>();

  if (pattern.source_publication) names.add(pattern.source_publication);
  for (const source of pattern.sources ?? []) {
    if (source.publication) names.add(source.publication);
  }

  return names;
}
