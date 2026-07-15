/** Regenerates COMPONENTS.md from the intent registry. Run via `npm run gen -w @jumbo/ui`. */
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { allIntents } from "../src/registry";
import { generateCatalog } from "../src/lib/catalog";

const out = fileURLToPath(new URL("../COMPONENTS.md", import.meta.url));
writeFileSync(out, generateCatalog(allIntents), "utf8");
process.stdout.write(
  `wrote ${allIntents.length} components to COMPONENTS.md\n`,
);
