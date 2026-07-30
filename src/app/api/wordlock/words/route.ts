/**
 * Serves the Word Lock word list to the browser, where it drives the
 * trace-time validity hint only. Served from a route rather than a public asset
 * so there is one committed copy of the blob, and cached hard because the list
 * changes only when the build script is rerun.
 */
import { WORD_BLOB } from "@jumbo/engine/minigames/wordlock/words";

export const dynamic = "force-static";

export function GET(): Response {
  return new Response(WORD_BLOB, {
    headers: {
      "content-type": "text/plain; charset=utf-8",
      "cache-control": "public, max-age=31536000, immutable",
    },
  });
}
