import { defineLocale } from "../locale/defineLocale";
import { createNumber, createPlural } from "../locale/plural";

/**
 * Korean
 *
 * Labels for every component. Korean has one plural form, and labels end in a
 * noun, as Korean interfaces write them ("행 선택").
 *
 * Drafted from the English labels; corrections from native speakers are welcome.
 *
 * @example
 * ```tsx
 * import { ko } from "slotsmith/locales/ko";
 *
 * <DataTable locale={ko} data={rows} columns={columns} />;
 * ```
 */
export const ko = defineLocale({
  code: "ko",
  dir: "ltr",

  table: (code) => {
    const number = createNumber(code);
    return {
      empty: "데이터 없음",
      error: "데이터를 불러오는 중 오류가 발생했습니다.",
      retry: "다시 시도",
      rowsPerPage: "페이지당 행 수",
      pageInfo: (page, pageCount) => `${number(pageCount)}페이지 중 ${number(page)}페이지`,
      pagination: "페이지 탐색",
      previousPage: "이전 페이지",
      nextPage: "다음 페이지",
      selectAll: "이 페이지의 모든 행 선택",
      selectRow: "행 선택",
      expandRow: "행 펼치기",
      collapseRow: "행 접기",
      reorderRow: "행 순서 변경",
      reorderInstructions:
        "스페이스 키로 행을 들어 올리고, 화살표 키로 옮기고, 스페이스 키로 내려놓고, Esc 키로 취소합니다.",
      reorderLifted: (position, total) => `행을 들어 올렸습니다. ${number(total)}개 중 ${number(position)}번째 위치입니다.`,
      reorderMoved: (position, total) => `${number(total)}개 중 ${number(position)}번째 위치입니다.`,
      reorderDropped: (position, total) => `행을 ${number(total)}개 중 ${number(position)}번째 위치에 놓았습니다.`,
      reorderCancelled: "순서 변경을 취소했습니다.",
    };
  },

  autocomplete: (code) => {
    const plural = createPlural(code);
    const number = createNumber(code);
    return {
      placeholder: "선택…",
      search: "검색…",
      clear: "선택 지우기",
      remove: (label) => `${label} 제거`,
      empty: "결과 없음",
      loading: "불러오는 중…",
      minChars: (count) => plural(count, { other: "검색하려면 {count}자 이상 입력" }),
      retry: "다시 시도",
      create: (query) => `“${query}” 만들기`,
      creating: "만드는 중…",
      more: (count) => `+${number(count)}`,
      loadMore: "더 불러오기",
      results: (count) => plural(count, { other: "결과 {count}개" }),
    };
  },

  datePicker: (code) => {
    const plural = createPlural(code);
    return {
      placeholder: "날짜 선택",
      clear: "날짜 지우기",
      previous: "이전 달",
      next: "다음 달",
      today: "오늘로 이동",
      month: "월",
      year: "연도",
      dialog: "날짜 선택기",
      count: (count) => plural(count, { other: "날짜 {count}개 선택됨" }),
      rangeStart: (from) => `${from} — …`,
      range: (from, to) => `${from} — ${to}`,
    };
  },

  fileUploader: (code) => {
    const plural = createPlural(code);
    return {
      title: "끌어다 놓기 또는 찾아보기",
      // Same parts as the English hint: the accepted types, the size limit,
      // and the file limit only when more than one file is allowed.
      hint: ({ accept, maxSize, maxFiles }) =>
        [
          accept ? accept.replace(/,/g, ", ") : null,
          maxSize ? `최대 ${maxSize}` : null,
          maxFiles && maxFiles > 1 ? plural(maxFiles, { other: "파일 최대 {count}개" }) : null,
        ]
          .filter(Boolean)
          .join(" · "),
      dropHere: "놓아서 추가",
      browse: "찾아보기",
      dropzone: "파일 추가",
      remove: "파일 제거",
      retry: "업로드 다시 시도",
      cancel: "업로드 취소",
      progress: (name) => `${name} 업로드 중`,
      ready: "준비됨",
      uploading: "업로드 중…",
      done: "업로드 완료",
      failed: "실패",
      preview: (name) => `${name} 미리보기`,
      dismiss: "닫기",
      rejectedTitle: (count) => plural(count, { other: "파일 {count}개 추가 실패" }),
    };
  },

  fileValidation: (code) => {
    const plural = createPlural(code);
    return {
      wrongType: (name) => `${name}: 허용되지 않는 파일 형식`,
      tooLarge: (name, max) => `${name}: 파일이 너무 큼(최대 ${max})`,
      tooSmall: (name, min) => `${name}: 파일이 너무 작음(최소 ${min})`,
      tooMany: (max) => plural(max, { other: "파일은 최대 {count}개까지 추가 가능" }),
    };
  },
});
