export function createFindCache<T>(maxEntries: number) {
  if (!Number.isInteger(maxEntries) || maxEntries < 1) {
    throw new Error("Cache size must be a positive integer.");
  }

  const entries = new Map<string, T>();

  return {
    has(key: string) {
      return entries.has(key);
    },
    get(key: string) {
      return entries.get(key);
    },
    set(key: string, value: T) {
      if (entries.has(key)) entries.delete(key);
      entries.set(key, value);

      while (entries.size > maxEntries) {
        const oldest = entries.keys().next().value;
        if (oldest === undefined) break;
        entries.delete(oldest);
      }
    },
  };
}
