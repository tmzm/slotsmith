import { defineLocale } from "../locale/defineLocale";
import { createNumber, createPlural } from "../locale/plural";
import type { SlotsmithLocale } from "../locale/types";

/**
 * Hindi
 *
 * Labels for every component, in Devanagari. Numbers use the digits the tag
 * asks for, which for `hi` are Latin digits.
 *
 * Drafted from the English labels; corrections from native speakers are welcome.
 *
 * @example
 * ```tsx
 * import { hi } from "slotsmith/locales/hi";
 *
 * <DataTable locale={hi} data={rows} columns={columns} />;
 * ```
 */
export const hi: SlotsmithLocale = defineLocale({
  code: "hi",
  dir: "ltr",

  table: (code) => {
    const number = createNumber(code);
    return {
      empty: "कोई डेटा नहीं मिला",
      error: "डेटा लोड करते समय कोई गड़बड़ी हुई।",
      retry: "फिर से कोशिश करें",
      rowsPerPage: "प्रति पेज पंक्तियाँ",
      pageInfo: (page, pageCount) => `पेज ${number(page)} / ${number(pageCount)}`,
      pagination: "पेज नेविगेशन",
      previousPage: "पिछला पेज",
      nextPage: "अगला पेज",
      selectAll: "इस पेज की सभी पंक्तियाँ चुनें",
      selectRow: "पंक्ति चुनें",
      expandRow: "पंक्ति खोलें",
      collapseRow: "पंक्ति समेटें",
      reorderRow: "पंक्ति का क्रम बदलें",
      reorderInstructions:
        "पंक्ति उठाने के लिए स्पेस, उसे खिसकाने के लिए तीर कुंजियाँ, उसे छोड़ने के लिए स्पेस और रद्द करने के लिए एस्केप दबाएँ।",
      reorderLifted: (position, total) => `पंक्ति उठाई गई। ${number(total)} में से स्थान ${number(position)}।`,
      reorderMoved: (position, total) => `${number(total)} में से स्थान ${number(position)}।`,
      reorderDropped: (position, total) => `पंक्ति ${number(total)} में से स्थान ${number(position)} पर छोड़ी गई।`,
      reorderCancelled: "क्रम बदलना रद्द किया गया।",
    };
  },

  autocomplete: (code) => {
    const plural = createPlural(code);
    const number = createNumber(code);
    return {
      placeholder: "चुनें…",
      search: "खोजें…",
      clear: "चयन हटाएँ",
      remove: (label) => `${label} हटाएँ`,
      empty: "कोई परिणाम नहीं",
      loading: "लोड हो रहा है…",
      minChars: (count) =>
        plural(count, {
          one: "खोजने के लिए कम से कम {count} अक्षर लिखें",
          other: "खोजने के लिए कम से कम {count} अक्षर लिखें",
        }),
      retry: "फिर से कोशिश करें",
      create: (query) => `“${query}” बनाएँ`,
      creating: "बनाया जा रहा है…",
      more: (count) => `+${number(count)}`,
      loadMore: "और लोड करें",
      results: (count) =>
        plural(count, {
          one: "{count} परिणाम",
          other: "{count} परिणाम",
        }),
    };
  },

  datePicker: (code) => {
    const plural = createPlural(code);
    return {
      placeholder: "तारीख चुनें",
      clear: "तारीख हटाएँ",
      previous: "पिछला महीना",
      next: "अगला महीना",
      today: "आज पर जाएं",
      month: "महीना",
      year: "साल",
      dialog: "तारीख का चयन",
      count: (count) =>
        plural(count, {
          one: "{count} तारीख चुनी गई",
          other: "{count} तारीखें चुनी गईं",
        }),
      rangeStart: (from) => `${from} — …`,
      range: (from, to) => `${from} — ${to}`,
    };
  },

  fileUploader: (code) => {
    const plural = createPlural(code);
    return {
      title: "खींचकर छोड़ें, या ब्राउज़ करें",
      // Same parts as the English hint: the accepted types, the size limit,
      // and the file limit only when more than one file is allowed.
      hint: ({ accept, maxSize, maxFiles }) =>
        [
          accept ? accept.replace(/,/g, ", ") : null,
          maxSize ? `${maxSize} तक` : null,
          maxFiles && maxFiles > 1 ? plural(maxFiles, { other: "अधिकतम {count} फ़ाइलें" }) : null,
        ]
          .filter(Boolean)
          .join(" · "),
      dropHere: "जोड़ने के लिए छोड़ें",
      browse: "ब्राउज़ करें",
      dropzone: "फ़ाइलें जोड़ें",
      remove: "फ़ाइल हटाएँ",
      retry: "फिर से अपलोड करें",
      cancel: "अपलोड रद्द करें",
      progress: (name) => `${name} अपलोड हो रही है`,
      ready: "तैयार",
      uploading: "अपलोड हो रहा है…",
      done: "अपलोड हो गया",
      failed: "विफल",
      preview: (name) => `${name} का पूर्वावलोकन`,
      dismiss: "बंद करें",
      rejectedTitle: (count) =>
        plural(count, {
          one: "{count} फ़ाइल नहीं जोड़ी गई",
          other: "{count} फ़ाइलें नहीं जोड़ी गईं",
        }),
    };
  },

  fileValidation: (code) => {
    const plural = createPlural(code);
    return {
      wrongType: (name) => `${name} का फ़ाइल प्रकार अनुमत नहीं है`,
      tooLarge: (name, max) => `${name} बहुत बड़ी है (अधिकतम ${max})`,
      tooSmall: (name, min) => `${name} बहुत छोटी है (न्यूनतम ${min})`,
      tooMany: (max) =>
        plural(max, {
          one: "केवल {count} फ़ाइल की अनुमति है",
          other: "केवल {count} फ़ाइलों की अनुमति है",
        }),
    };
  },
});
