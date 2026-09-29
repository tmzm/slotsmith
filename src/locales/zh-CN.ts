import { defineLocale } from "../locale/defineLocale";
import { createNumber, createPlural } from "../locale/plural";

/**
 * Chinese, simplified
 *
 * Labels for every component. Chinese has one plural form, numbers sit
 * directly against their measure word ("3个文件"), and punctuation is
 * full-width.
 *
 * Drafted from the English labels; corrections from native speakers are welcome.
 *
 * @example
 * ```tsx
 * import { zhCN } from "slotsmith/locales/zh-CN";
 *
 * <DataTable locale={zhCN} data={rows} columns={columns} />;
 * ```
 */
export const zhCN = defineLocale({
  code: "zh-CN",
  dir: "ltr",

  table: (code) => {
    const number = createNumber(code);
    return {
      empty: "暂无数据",
      error: "加载数据时出错。",
      retry: "重试",
      rowsPerPage: "每页行数",
      pageInfo: (page, pageCount) => `第${number(page)}页，共${number(pageCount)}页`,
      pagination: "分页",
      previousPage: "上一页",
      nextPage: "下一页",
      selectAll: "选择本页所有行",
      selectRow: "选择行",
      expandRow: "展开行",
      collapseRow: "收起行",
      reorderRow: "调整行顺序",
      reorderInstructions: "按空格键拿起该行，按方向键移动，按空格键放下，按 Esc 键取消。",
      reorderLifted: (position, total) => `已拿起该行。第${number(position)}行，共${number(total)}行。`,
      reorderMoved: (position, total) => `第${number(position)}行，共${number(total)}行。`,
      reorderDropped: (position, total) => `已将该行放到第${number(position)}行，共${number(total)}行。`,
      reorderCancelled: "已取消调整顺序。",
    };
  },

  autocomplete: (code) => {
    const plural = createPlural(code);
    const number = createNumber(code);
    return {
      placeholder: "请选择…",
      search: "搜索…",
      clear: "清除选择",
      remove: (label) => `移除${label}`,
      empty: "无结果",
      loading: "加载中…",
      minChars: (count) => plural(count, { other: "请至少输入{count}个字符进行搜索" }),
      retry: "重试",
      create: (query) => `创建“${query}”`,
      creating: "正在创建…",
      more: (count) => `+${number(count)}`,
      loadMore: "加载更多",
      results: (count) => plural(count, { other: "{count}个结果" }),
    };
  },

  datePicker: (code) => {
    const plural = createPlural(code);
    return {
      placeholder: "选择日期",
      clear: "清除日期",
      previous: "上个月",
      next: "下个月",
      today: "跳转到今天",
      month: "月份",
      year: "年份",
      dialog: "日期选择器",
      count: (count) => plural(count, { other: "已选择{count}个日期" }),
      rangeStart: (from) => `${from} — …`,
      range: (from, to) => `${from} — ${to}`,
    };
  },

  fileUploader: (code) => {
    const plural = createPlural(code);
    return {
      title: "拖放文件，或浏览",
      // Same parts as the English hint: the accepted types, the size limit,
      // and the file limit only when more than one file is allowed.
      hint: ({ accept, maxSize, maxFiles }) =>
        [
          accept ? accept.replace(/,/g, ", ") : null,
          maxSize ? `不超过${maxSize}` : null,
          maxFiles && maxFiles > 1 ? plural(maxFiles, { other: "最多{count}个文件" }) : null,
        ]
          .filter(Boolean)
          .join(" · "),
      dropHere: "松开即可添加",
      browse: "浏览",
      dropzone: "添加文件",
      remove: "移除文件",
      retry: "重新上传",
      cancel: "取消上传",
      progress: (name) => `正在上传${name}`,
      ready: "就绪",
      uploading: "上传中…",
      done: "已上传",
      failed: "失败",
      preview: (name) => `${name}的预览`,
      dismiss: "关闭",
      rejectedTitle: (count) => plural(count, { other: "{count}个文件未添加" }),
    };
  },

  fileValidation: (code) => {
    const plural = createPlural(code);
    return {
      wrongType: (name) => `不允许的文件类型：${name}`,
      tooLarge: (name, max) => `${name}过大（最大${max}）`,
      tooSmall: (name, min) => `${name}过小（最小${min}）`,
      tooMany: (max) => plural(max, { other: "最多只能添加{count}个文件" }),
    };
  },
});
