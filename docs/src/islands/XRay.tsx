/**
 * XRay
 *
 * The slot model guide's X-ray: a live data table on the landing's exploded
 * view (`ExplodedView` and `explodeParts`), a "Show parts" toggle that sets
 * `--explode` to 1, and a list of every slot in the table's reference, each
 * labelled `<Name>` (element part) or `{Name}` (widget part) and linking to
 * its row on the API page. Pointing at or focusing a slot in the list outlines
 * its elements in the table; a slot this table does not render says when it
 * appears instead.
 *
 * The slots come in as props, read from `getReference("data-table")` at build
 * time, so a slot added to the library shows up here without an edit. The
 * transition is CSS only (`styles/xray.css`): 320ms, instant under reduced
 * motion.
 */
import "@/styles/explode.css";
import "@/styles/xray.css";
import { useEffect, useMemo, useRef, useState } from "react";
import { DataTable, type DataTableColumnDef } from "slotsmith/data-table";
import ExplodedView from "@/islands/ExplodedView";
import SiteLocale from "@/islands/SiteLocale";
import { localePath, type Lang } from "@/i18n";
import { bracketLabel, explodeParts } from "@/lib/explode";
import { people, type Person } from "@samples/shared/people";
import { SLOT_SELECTORS } from "../../scripts/slot-selectors.ts";

export interface XRaySlot {
  name: string;
  kind: "element" | "widget";
}

export interface XRayProps {
  /** Every slot of the data table, from its generated reference. */
  slots: XRaySlot[];
  /** The page's language: the list links to this language's API page. */
  lang: Lang;
  /** The language the text and the table are shown in; an Arabic page with English prose passes `en`. Defaults to `lang`. */
  contentLang?: Lang;
}

/** The parts labelled on the table when it explodes: the landing's, less Cell (its label would sit on Row's), plus the footer row. */
const PICKS = ["HeaderRow", "HeaderCell", "SortIcon", "Row", "Checkbox", "FooterRow", "Pagination", "PageSizeSelect"];

type Messages = {
  toggle: string;
  list: string;
  hint: string;
  element: string;
  widget: string;
  absent: Record<string, string>;
  footer: (count: number) => string;
  columns: [string, string, string];
};

const MESSAGES: Record<Lang, Messages> = {
  en: {
    toggle: "Show parts",
    list: "Every part of the data table",
    hint: "Point at or focus a part to outline it in the table. Each one links to its row on the API page.",
    element: "element part: takes the element's props",
    widget: "widget part: told what is true",
    absent: {
      ExpandToggle: "with getSubRows (tree rows)",
      Skeleton: "while loading",
      Empty: "when there are no rows",
      Error: "when error is set",
      DragHandle: "with enableRowReorder",
    },
    footer: (count) => `${count} people`,
    columns: ["Name", "Role", "Team"],
  },
  ar: {
    toggle: "إظهار الأجزاء",
    list: "كل أجزاء جدول البيانات",
    hint: "مرّر المؤشر على جزء أو انتقل إليه ليُحدَّد في الجدول. كل جزء يرتبط بصفّه في صفحة الواجهة البرمجية.",
    element: "جزء عنصر: يأخذ خصائص العنصر",
    widget: "جزء أداة: يُخبَر بما هو صحيح",
    absent: {
      ExpandToggle: "مع getSubRows (صفوف شجرية)",
      Skeleton: "أثناء التحميل",
      Empty: "عندما لا توجد صفوف",
      Error: "عند ضبط error",
      DragHandle: "مع enableRowReorder",
    },
    footer: (count) => `${count} شخصًا`,
    columns: ["الاسم", "الدور", "الفريق"],
  },
};

export default function XRay({ slots, lang, contentLang = lang }: XRayProps) {
  const messages = MESSAGES[contentLang];
  const [exploded, setExploded] = useState(false);
  const [active, setActive] = useState<string | undefined>();
  const stage = useRef<HTMLDivElement>(null);
  const selectors = SLOT_SELECTORS["data-table"];

  const parts = useMemo(
    () => explodeParts({ name: "data-table", slots }, selectors, PICKS.filter((name) => slots.some((slot) => slot.name === name))),
    [slots, selectors],
  );

  const columns = useMemo<DataTableColumnDef<Person>[]>(() => {
    const [name, role, team] = messages.columns;
    return [
      { accessorKey: "name", header: name, footer: () => messages.footer(people.length) },
      { accessorKey: "role", header: role },
      { accessorKey: "team", header: team },
    ];
  }, [messages]);

  // Outline the active slot's elements; the selectors are the fallbacks' own classes.
  useEffect(() => {
    const root = stage.current;
    const selector = active ? selectors[active] : undefined;
    if (!root || !selector) return;
    const matches = [...root.querySelectorAll<HTMLElement>(selector)].filter((element) => !element.closest(".explode__label"));
    for (const element of matches) element.setAttribute("data-xray-active", "");
    return () => {
      for (const element of matches) element.removeAttribute("data-xray-active");
    };
  }, [active, selectors]);

  return (
    <div className="xray" data-exploded={exploded ? "" : undefined} lang={contentLang} dir={contentLang === "ar" ? "rtl" : "ltr"}>
      <div className="xray__bar">
        <button type="button" className="xray__toggle" aria-pressed={exploded} onClick={() => setExploded((value) => !value)}>
          <span className="xray__switch" aria-hidden="true" />
          {messages.toggle}
        </button>
      </div>

      <div className="xray__box site-demo" ref={stage}>
        <ExplodedView parts={parts} live>
          <SiteLocale lang={contentLang}>
            <DataTable
              data={people}
              columns={columns}
              getRowId={(person) => person.id}
              enableRowSelection
              // Chloe Martin is on the first page sorted by name: her row shows data-state="selected".
              defaultSelection={[people[5]!]}
              defaultSorting={[{ id: "name", desc: false }]}
              defaultPagination={{ pageIndex: 0, pageSize: 5 }}
              pageSizeOptions={[5, 10]}
            />
          </SiteLocale>
        </ExplodedView>
      </div>

      <p className="xray__hint">{messages.hint}</p>
      <dl className="xray__legend">
        <div>
          <dt>
            <code className="xray__label xray__label--element" dir="ltr">{"<Name>"}</code>
          </dt>
          <dd>{messages.element}</dd>
        </div>
        <div>
          <dt>
            <code className="xray__label xray__label--widget" dir="ltr">{"{Name}"}</code>
          </dt>
          <dd>{messages.widget}</dd>
        </div>
      </dl>

      <ul className="xray__list" aria-label={messages.list}>
        {slots.map((slot) => {
          const absent = messages.absent[slot.name];
          return (
            <li key={slot.name} className="xray__item">
              <a
                className="xray__link"
                href={localePath(lang, `/components/data-table/api/#slot-${slot.name}`)}
                data-active={active === slot.name ? "" : undefined}
                onPointerEnter={() => setActive(slot.name)}
                onPointerLeave={() => setActive((current) => (current === slot.name ? undefined : current))}
                onFocus={() => setActive(slot.name)}
                onBlur={() => setActive((current) => (current === slot.name ? undefined : current))}
              >
                <code className={`xray__label xray__label--${slot.kind}`} dir="ltr">
                  {bracketLabel({ slot: slot.name, kind: slot.kind })}
                </code>
                {absent && <span className="xray__absent">{absent}</span>}
              </a>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
