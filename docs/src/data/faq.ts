/**
 * FAQ
 *
 * The questions the landing answers, and the shape every FAQ uses. A
 * component overview lists its own in its MDX frontmatter (`faq:`), and an
 * Arabic twin brings its own. The visible FAQ (`Faq.astro`) and the
 * `FAQPage` JSON-LD are both made from the same items, and `verify-site`
 * compares them on the built page.
 */
import { t, type Lang, type MessageKey } from "@/i18n";
import { getFacts, kilobytes } from "@/lib/facts";

/** One question, its answer as plain text, and the page that shows it. */
export interface FaqItem {
  q: string;
  a: string;
  /** A language-neutral site path (`/theming/`), or an absolute URL. */
  link?: string;
}

/** The landing's questions, in order: message key stem and the page that shows the answer. */
const LANDING: { key: string; link: string }[] = [
  { key: "nextjs", link: "/getting-started/" },
  { key: "tailwind", link: "/theming/" },
  { key: "designSystem", link: "/components/data-table/adapters/" },
  { key: "bundle", link: "/trust/#bundle-size" },
  { key: "react18", link: "/trust/#react" },
  { key: "license", link: "/trust/#license" },
];

/**
 * The landing FAQ in one language, with the measured facts filled in.
 *
 * @throws When the facts have no `slotsmith/data-table` bundle entry.
 */
export function landingFaq(lang: Lang): FaqItem[] {
  const facts = getFacts();
  const table = facts.bundle.find((entry) => entry.entry === "slotsmith/data-table");
  if (!table) throw new Error('The facts have no "slotsmith/data-table" bundle entry.');
  const vars = { size: kilobytes(table.gzipBytes), react: facts.react, license: facts.license };
  return LANDING.map(({ key, link }) => ({
    q: t(lang, `faq.${key}.q` as MessageKey),
    a: t(lang, `faq.${key}.a` as MessageKey, vars),
    link,
  }));
}
