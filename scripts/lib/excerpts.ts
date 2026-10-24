export function normalizeExcerptText(value: string): string {
  return value
    .replace(/\[[0-9]{1,2}:[0-9]{2}(?::[0-9]{2})?\]/g, " ")
    .replace(/[“”„«»]/g, '"')
    .replace(/[‘’‚‹›]/g, "'")
    .replace(/\u00a0/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function excerptMatches(excerpt: string, body: string): boolean {
  const segments = excerpt
    .split("[...]")
    .map((segment) => normalizeExcerptText(segment))
    .filter(Boolean);

  if (segments.length === 0) {
    return false;
  }

  const normalizedBody = normalizeExcerptText(body);
  return segments.every((segment) => normalizedBody.includes(segment));
}
