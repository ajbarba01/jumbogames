/**
 * Word membership for Word Lock. The blob is installed by each authoritative
 * runtime at startup rather than imported here, so the ~1.5 MB word list never
 * enters the minigame registry's import graph and cannot reach a browser
 * bundle through it. Lookups throw when uninstalled: a runtime that forgot to
 * install would otherwise reject every legal word silently.
 *
 * The prefix index that backs `hasPrefix` is built lazily, on its first call,
 * rather than inside `installWordList`: every authoritative runtime installs
 * the word list at cold start, but the solver that needs prefixes never runs
 * in production, so paying to build it there would tax every cold start for
 * a capability that path never exercises. Building it off `words` also keeps
 * this module the single place word data lives — no second copy in the
 * solver.
 */
let words: Set<string> | null = null;
let prefixes: Set<string> | null = null;

export function installWordList(blob: string): void {
  const parsedWords = new Set<string>();
  for (const line of blob.split("\n")) {
    const word = line.trim().toUpperCase();
    if (word.length > 0) parsedWords.add(word);
  }
  words = parsedWords;
  prefixes = null;
}

export function isWordListInstalled(): boolean {
  return words !== null;
}

/** Test seam; production runtimes install once at module scope. */
export function resetWordListForTests(): void {
  words = null;
  prefixes = null;
}

export function hasWord(word: string): boolean {
  if (words === null) throw new Error("word list not installed");
  return words.has(word.toUpperCase());
}

export function hasPrefix(prefix: string): boolean {
  if (words === null) throw new Error("word list not installed");
  if (prefixes === null) {
    const built = new Set<string>();
    for (const word of words) {
      for (let i = 1; i <= word.length; i++) {
        built.add(word.slice(0, i));
      }
    }
    prefixes = built;
  }
  return prefixes.has(prefix.toUpperCase());
}
