import { defineLocale } from "../locale/defineLocale";
import { createNumber, createPlural } from "../locale/plural";

/**
 * Japanese
 *
 * Labels for every component. Japanese has one plural form, labels use the
 * plain noun style of Japanese interfaces ("行を選択"), and punctuation is
 * full-width.
 *
 * Drafted from the English labels; corrections from native speakers are welcome.
 *
 * @example
 * ```tsx
 * import { ja } from "slotsmith/locales/ja";
 *
 * <DataTable locale={ja} data={rows} columns={columns} />;
 * ```
 */
export const ja = defineLocale({
  code: "ja",
  dir: "ltr",

  table: (code) => {
    const number = createNumber(code);
    return {
      empty: "データがありません",
      error: "データの読み込み中にエラーが発生しました。",
      retry: "再試行",
      rowsPerPage: "1ページあたりの行数",
      pageInfo: (page, pageCount) => `${number(page)} / ${number(pageCount)}ページ`,
      pagination: "ページ送り",
      previousPage: "前のページ",
      nextPage: "次のページ",
      selectAll: "このページのすべての行を選択",
      selectRow: "行を選択",
      expandRow: "行を展開",
      collapseRow: "行を折りたたむ",
      reorderRow: "行を並べ替え",
      reorderInstructions:
        "スペースキーで行を持ち上げ、矢印キーで移動し、スペースキーで配置します。Escキーでキャンセルします。",
      reorderLifted: (position, total) => `行を持ち上げました。${number(total)}行中${number(position)}番目です。`,
      reorderMoved: (position, total) => `${number(total)}行中${number(position)}番目です。`,
      reorderDropped: (position, total) => `行を${number(total)}行中${number(position)}番目に配置しました。`,
      reorderCancelled: "並べ替えをキャンセルしました。",
    };
  },

  autocomplete: (code) => {
    const plural = createPlural(code);
    const number = createNumber(code);
    return {
      placeholder: "選択してください",
      search: "検索…",
      clear: "選択をクリア",
      remove: (label) => `${label}を削除`,
      empty: "結果がありません",
      loading: "読み込み中…",
      minChars: (count) => plural(count, { other: "{count}文字以上入力して検索" }),
      retry: "再試行",
      create: (query) => `「${query}」を作成`,
      creating: "作成中…",
      more: (count) => `+${number(count)}`,
      loadMore: "さらに読み込む",
      results: (count) => plural(count, { other: "{count}件の結果" }),
    };
  },

  datePicker: (code) => {
    const plural = createPlural(code);
    return {
      placeholder: "日付を選択",
      clear: "日付をクリア",
      previous: "前の月",
      next: "次の月",
      today: "今日",
      month: "月",
      year: "年",
      dialog: "日付の選択",
      count: (count) => plural(count, { other: "{count}件の日付を選択中" }),
      rangeStart: (from) => `${from} — …`,
      range: (from, to) => `${from} — ${to}`,
    };
  },

  fileUploader: (code) => {
    const plural = createPlural(code);
    return {
      title: "ドラッグ＆ドロップ、または参照",
      // Same parts as the English hint: the accepted types, the size limit,
      // and the file limit only when more than one file is allowed.
      hint: ({ accept, maxSize, maxFiles }) =>
        [
          accept ? accept.replace(/,/g, ", ") : null,
          maxSize ? `最大${maxSize}` : null,
          maxFiles && maxFiles > 1 ? plural(maxFiles, { other: "{count}ファイルまで" }) : null,
        ]
          .filter(Boolean)
          .join(" · "),
      dropHere: "ドロップして追加",
      browse: "参照",
      dropzone: "ファイルを追加",
      remove: "ファイルを削除",
      retry: "アップロードを再試行",
      cancel: "アップロードをキャンセル",
      progress: (name) => `${name}をアップロード中`,
      ready: "準備完了",
      uploading: "アップロード中…",
      done: "アップロード完了",
      failed: "失敗",
      preview: (name) => `${name}のプレビュー`,
      dismiss: "閉じる",
      rejectedTitle: (count) => plural(count, { other: "{count}件のファイルを追加できませんでした" }),
    };
  },

  fileValidation: (code) => {
    const plural = createPlural(code);
    return {
      wrongType: (name) => `${name}は許可されていないファイル形式です`,
      tooLarge: (name, max) => `${name}は大きすぎます（最大${max}）`,
      tooSmall: (name, min) => `${name}は小さすぎます（最小${min}）`,
      tooMany: (max) => plural(max, { other: "追加できるファイルは{count}件までです" }),
    };
  },
});
