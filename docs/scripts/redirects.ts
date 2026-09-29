import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { netlifyRedirects } from "../src/lib/redirects.ts";

const out = resolve(dirname(fileURLToPath(import.meta.url)), "../public/_redirects");
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, netlifyRedirects());
console.log(`wrote ${out}`);
