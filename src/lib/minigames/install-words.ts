/**
 * Installs the Word Lock dictionary on the Next server. Imported for its side
 * effect by the route handlers that drive a match, so `apply` can never run
 * server-side against an uninstalled list.
 */
import "server-only";
import { installBundledWordList } from "@jumbo/engine/minigames/wordlock/install-words";

installBundledWordList();
