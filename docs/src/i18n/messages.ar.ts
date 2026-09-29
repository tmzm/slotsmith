import type { MessageKey } from "./index";

/**
 * Arabic message catalog
 *
 * Modern Standard Arabic for developers. Names that belong to the code (props,
 * components, libraries, commands) stay in Latin script. The annotation is the
 * guarantee: a key missing here fails `tsc`.
 */
export const ar: Record<MessageKey, string> = {
  "site.name": "slotsmith",
  "site.tagline": "مكوّنات React يمكنك تفكيكها",
  "site.positioning":
    "جدول بيانات ومربع تحرير وسرد ومنتقي تاريخ ورافع ملفات جاهزة لـ React، تندمج في shadcn/ui أو MUI أو Chakra أو في نظام التصميم الخاص بك.",

  "common.skip": "تخطَّ إلى المحتوى",
  "common.home": "الصفحة الرئيسية لـ slotsmith",
  "common.githubLabel": "slotsmith على GitHub",
  "common.npmLabel": "slotsmith على npm",
  "common.menu": "القائمة",
  "common.close": "إغلاق",
  "common.version": "الإصدار {version}",
  "common.github": "GitHub",
  "common.npm": "npm",
  "common.search": "بحث",
  "common.copy": "نسخ",
  "common.copied": "تم النسخ",
  "common.editPage": "عدّل هذه الصفحة",
  "common.onThisPage": "في هذه الصفحة",
  "common.untranslated": "هذه الصفحة غير مترجمة بعد، وهي معروضة بالإنجليزية.",
  "common.footerLicense": "رخصة ISC",
  "common.footerAuthor": "من تطوير Tareq Al-Mozayek",

  "switch.theme": "سمة الألوان",
  "switch.light": "فاتح",
  "switch.dark": "داكن",
  "switch.toLight": "التبديل إلى السمة الفاتحة",
  "switch.toDark": "التبديل إلى السمة الداكنة",
  "switch.language": "تبديل لغة الموقع إلى الإنجليزية",
  "switch.otherLanguage": "English",

  "nav.sidebar": "التوثيق",
  "nav.dock": "إجراءات سريعة",
  "nav.gettingStarted": "البداية",
  "nav.guides": "الأدلة",
  "nav.components": "المكوّنات",
  "nav.dataTable": "جدول البيانات",
  "nav.autocomplete": "الإكمال التلقائي",
  "nav.datePicker": "منتقي التاريخ",
  "nav.fileUploader": "رافع الملفات",
  "nav.theming": "التنسيق والسمات",
  "nav.languages": "اللغات",
  "nav.aiTools": "أدوات الذكاء الاصطناعي",
  "nav.trust": "الثقة",
  "nav.roadmap": "خارطة الطريق",
  "nav.comparison": "المقارنة",
  "nav.changelog": "سجل التغييرات",
  "nav.about": "عن المشروع",

  "component.overview": "نظرة عامة",
  "component.install": "التثبيت",
  "component.quickStart": "البدء السريع",
  "component.guides": "الأدلة",
  "component.api": "واجهة البرمجة",
  "component.adapters": "المحوّلات",
  "component.accessibility": "إمكانية الوصول",
  "component.limitations": "القيود",
};
