/**
 * Installs the bundled word list. Imported only by runtime entry points — the
 * realtime Worker and the Next server — never by the minigame registry, which
 * is what keeps the blob out of client bundles.
 */
import { installWordList, isWordListInstalled } from "./dictionary";
import { WORD_BLOB } from "./words.generated";

export function installBundledWordList(): void {
  if (!isWordListInstalled()) installWordList(WORD_BLOB);
}
