// ponytail: heuristic only; the LLM judge is the real gate, this just saves API calls on obvious junk

const VOWEL = /[aeiouy]/i;
const CONSONANT_RUN = /[bcdfghjklmnpqrstvwxz]{5,}/i;
const REPEATED_CHAR = /(.)\1{5,}/;

export function normalizeQuery(query: string): string {
  return query.trim().replace(/\s+/g, " ").slice(0, 1000);
}

const KEYBOARD_ROWS = ["qwertyuiop", "asdfghjkl", "zxcvbnm"];

function keyboardDominates(query: string): boolean {
  const letters = query.toLowerCase().replace(/[^a-z]/g, "");
  if (letters.length < 4) return false;
  if (KEYBOARD_ROWS.some((row) => row.includes(letters))) return true;

  const covered = (letters.match(/qwerty|asdfg|zxcvbn|asdf|qwer|zxcv/g) ?? []).reduce(
    (sum, hit) => sum + hit.length,
    0,
  );
  return covered / letters.length > 0.4;
}

export function isObviousGibberish(query: string): boolean {
  const words = query.match(/[a-z]{2,}/gi) ?? [];
  const onlyWord = words.length === 1 ? words[0] : "";
  const oneRealWord = onlyWord.length >= 4 && VOWEL.test(onlyWord) && !CONSONANT_RUN.test(onlyWord);

  // "chatbot" is one real word and must pass. A lone smash still fails below.
  if (words.length < 2 && !oneRealWord) return true;

  const compact = query.replace(/\s/g, "");
  const letterCount = compact.match(/[a-z]/gi)?.length ?? 0;
  if (compact.length === 0 || letterCount / compact.length < 0.5) return true;

  const tokens = query.split(/\s+/).filter(Boolean);
  const badTokens = tokens.filter((token) => {
    const acronym = /^[A-Z]{2,5}$/.test(token);
    return (!acronym && !VOWEL.test(token)) || CONSONANT_RUN.test(token);
  });
  if (tokens.length > 0 && badTokens.length / tokens.length > 0.4) return true;

  if (REPEATED_CHAR.test(query)) return true;

  return keyboardDominates(query);
}
