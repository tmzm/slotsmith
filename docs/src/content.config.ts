import { defineCollection } from "astro:content";
import { glob } from "astro/loaders";
import { z } from "astro/zod";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { Loader } from "astro/loaders";
import { SITE } from "../site.config.ts";
import { LANGS, localePath } from "./i18n/index.ts";
import { README_ANCHOR_PATHS, hasNotes, parseChangelog, releaseId, resolveReadmeLinks } from "./lib/changelog.ts";

const docs = defineCollection({
  loader: glob({ pattern: "**/*.mdx", base: "./src/content/docs" }),
  schema: z.object({
    title: z.string(),
    description: z.string().min(1).max(160),
    draft: z.boolean().optional(),
    /** A component overview's FAQ, rendered by `<Faq />` and as `FAQPage` JSON-LD. Answers are plain text. */
    faq: z
      .array(
        z.object({
          q: z.string().min(1),
          a: z.string().min(1),
          /** A language-neutral site path or an absolute URL where the answer is shown. */
          link: z.string().optional(),
        }),
      )
      .optional(),
  }),
});

/**
 * The release notes from the root README's changelog, one entry per release
 * and language (`en/1.6.0`, `ar/unreleased`), rendered by Astro's own
 * Markdown processor. The notes are the same English text in both; only the
 * links differ, since a README anchor becomes a page of that language. A
 * release with no notes has no entry.
 */
const readmeChangelog: Loader = {
  name: "readme-changelog",
  async load({ store, config, parseData, renderMarkdown, generateDigest, watcher }) {
    const readme = resolve(fileURLToPath(config.root), "..", "README.md");
    const sync = async () => {
      const releases = parseChangelog(readFileSync(readme, "utf8")).filter(hasNotes);
      store.clear();
      for (const lang of LANGS) {
        for (const [order, release] of releases.entries()) {
          const markdown = resolveReadmeLinks(release.markdown, (anchor) => {
            const path = README_ANCHOR_PATHS[anchor];
            return path ? localePath(lang, path) : `${SITE.repo}#${anchor}`;
          });
          const id = `${lang}/${releaseId(release)}`;
          const data = await parseData({ id, data: { version: release.version, unreleased: release.unreleased, lang, order } });
          store.set({ id, data, body: markdown, digest: generateDigest(markdown), rendered: await renderMarkdown(markdown) });
        }
      }
    };
    await sync();
    // In dev, an edit to the README shows on the page without a restart.
    watcher?.add(readme);
    watcher?.on("change", (changed) => {
      if (resolve(changed) === readme) void sync();
    });
  },
};

const changelog = defineCollection({
  loader: readmeChangelog,
  schema: z.object({
    /** The heading as the README writes it: `1.6.0` or `Unreleased`. */
    version: z.string(),
    unreleased: z.boolean(),
    lang: z.enum(["en", "ar"]),
    /** Position in the README, newest first. */
    order: z.number(),
  }),
});

export const collections = { docs, changelog };
