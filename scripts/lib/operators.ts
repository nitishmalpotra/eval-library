export type OperatorMerge = {
  from: string;
  to: string;
};

const HONORIFICS = new Set(["dr", "mr", "mrs", "ms", "miss", "prof", "professor"]);

const PERSON_ALIASES = new Map<string, string>([
  ["nick", "Nick Ung"],
  ["hl hussein", "Hamel Husain"],
  ["amy", "Ami Vora"],
  ["ammy", "Ami Vora"],
  ["mike", "Mike Krieger"],
]);

function squash(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

function splitPeople(operator: string): string[] {
  return operator
    .split(/\s*(?:,|&|\band\b)\s*/i)
    .map((part) => squash(part))
    .filter(Boolean);
}

function cleanPersonName(name: string): string {
  return name
    .split(" ")
    .filter((token) => {
      const bare = token.replace(/\./g, "").toLowerCase();
      return bare.length > 1 && !HONORIFICS.has(bare);
    })
    .join(" ");
}

function tokensOf(name: string): string[] {
  return name.split(" ").filter(Boolean);
}

function sameEnds(left: string[], right: string[]): boolean {
  return (
    left.length >= 2 &&
    right.length >= 2 &&
    left[0].toLowerCase() === right[0].toLowerCase() &&
    left[left.length - 1].toLowerCase() === right[right.length - 1].toLowerCase()
  );
}

function isTokenSubset(shorter: string[], longer: string[]): boolean {
  if (shorter.length > longer.length) {
    return false;
  }

  const pool = longer.map((token) => token.toLowerCase());

  for (const token of shorter) {
    const index = pool.indexOf(token.toLowerCase());

    if (index === -1) {
      return false;
    }

    pool.splice(index, 1);
  }

  return true;
}

function findRoot(parents: Map<string, string>, name: string): string {
  let current = name;

  while (parents.get(current) !== current) {
    const parent = parents.get(current);

    if (!parent) {
      return current;
    }

    const grandparent = parents.get(parent) ?? parent;
    parents.set(current, grandparent);
    current = parent;
  }

  return current;
}

function preferDisplay(left: string, right: string, counts: Map<string, number>): string {
  const leftTokens = tokensOf(left).length;
  const rightTokens = tokensOf(right).length;

  if (leftTokens !== rightTokens) {
    return leftTokens < rightTokens ? left : right;
  }

  const leftCount = counts.get(left) ?? 0;
  const rightCount = counts.get(right) ?? 0;

  if (leftCount !== rightCount) {
    return leftCount > rightCount ? left : right;
  }

  const leftTitled = left !== left.toLowerCase();
  const rightTitled = right !== right.toLowerCase();

  if (leftTitled !== rightTitled) {
    return leftTitled ? left : right;
  }

  return left.localeCompare(right) <= 0 ? left : right;
}

export function normalizeOperators(operators: string[]): {
  normalized: Map<string, string>;
  merges: OperatorMerge[];
} {
  const surfaces: string[] = [];

  for (const operator of operators) {
    surfaces.push(...splitPeople(operator));
  }

  const cleanedCounts = new Map<string, number>();
  const cleanedBySurface = new Map<string, string>();

  for (const surface of surfaces) {
    const cleanedName = cleanPersonName(surface) || surface;
    const cleaned = PERSON_ALIASES.get(cleanedName.toLowerCase()) ?? cleanedName;
    cleanedBySurface.set(surface, cleaned);
    cleanedCounts.set(cleaned, (cleanedCounts.get(cleaned) ?? 0) + 1);
  }

  const cleanedNames = [...cleanedCounts.keys()];
  const parents = new Map(cleanedNames.map((name) => [name, name]));

  for (let leftIndex = 0; leftIndex < cleanedNames.length; leftIndex += 1) {
    for (let rightIndex = leftIndex + 1; rightIndex < cleanedNames.length; rightIndex += 1) {
      const left = cleanedNames[leftIndex];
      const right = cleanedNames[rightIndex];
      const leftTokens = tokensOf(left);
      const rightTokens = tokensOf(right);

      if (!sameEnds(leftTokens, rightTokens)) {
        continue;
      }

      const shorter = leftTokens.length <= rightTokens.length ? leftTokens : rightTokens;
      const longer = leftTokens.length <= rightTokens.length ? rightTokens : leftTokens;

      if (!isTokenSubset(shorter, longer)) {
        continue;
      }

      const leftRoot = findRoot(parents, left);
      const rightRoot = findRoot(parents, right);
      parents.set(rightRoot, leftRoot);
    }
  }

  const membersByRoot = new Map<string, string[]>();

  for (const name of cleanedNames) {
    const root = findRoot(parents, name);
    const members = membersByRoot.get(root) ?? [];
    members.push(name);
    membersByRoot.set(root, members);
  }

  const canonicalByCleaned = new Map<string, string>();

  for (const [root, members] of membersByRoot) {
    const canonical = members.reduce((best, name) => preferDisplay(best, name, cleanedCounts));
    canonicalByCleaned.set(root, canonical);

    for (const member of members) {
      canonicalByCleaned.set(member, canonical);
    }
  }

  const canonicalBySurface = new Map<string, string>();
  const merges: OperatorMerge[] = [];
  const seenMerges = new Set<string>();

  for (const surface of new Set(surfaces)) {
    const cleaned = cleanedBySurface.get(surface) ?? surface;
    const canonical = canonicalByCleaned.get(cleaned) ?? cleaned;
    canonicalBySurface.set(surface, canonical);

    if (surface === canonical) {
      continue;
    }

    const key = `${surface}\0${canonical}`;

    if (seenMerges.has(key)) {
      continue;
    }

    seenMerges.add(key);
    merges.push({ from: surface, to: canonical });
  }

  merges.sort((left, right) => left.from.localeCompare(right.from) || left.to.localeCompare(right.to));

  const normalized = new Map<string, string>();

  for (const operator of new Set(operators)) {
    const people: string[] = [];
    const seen = new Set<string>();

    for (const surface of splitPeople(operator)) {
      const canonical = canonicalBySurface.get(surface) ?? surface;
      const key = canonical.toLowerCase();

      if (!canonical || seen.has(key)) {
        continue;
      }

      seen.add(key);
      people.push(canonical);
    }

    people.sort((left, right) => left.localeCompare(right));
    normalized.set(operator, people.join(", "));
  }

  return { normalized, merges };
}
