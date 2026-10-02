import { defineCollection } from "astro:content";
import { glob } from "astro/loaders";
import { z } from "astro/zod";

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

export const collections = { docs };
