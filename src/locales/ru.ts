import { defineLocale } from "../locale/defineLocale";
import { createNumber, createPlural } from "../locale/plural";

/**
 * Russian
 *
 * Labels for every component. Every count has all four Russian forms, so the
 * noun agrees with the number ("1 файл", "2 файла", "5 файлов").
 *
 * Drafted from the English labels; corrections from native speakers are welcome.
 *
 * @example
 * ```tsx
 * import { ru } from "slotsmith/locales/ru";
 *
 * <DataTable locale={ru} data={rows} columns={columns} />;
 * ```
 */
export const ru = defineLocale({
  code: "ru",
  dir: "ltr",

  table: (code) => {
    const number = createNumber(code);
    return {
      empty: "Данные не найдены",
      error: "При загрузке данных произошла ошибка.",
      retry: "Повторить",
      rowsPerPage: "Строк на странице",
      pageInfo: (page, pageCount) => `Страница ${number(page)} из ${number(pageCount)}`,
      pagination: "Навигация по страницам",
      previousPage: "Предыдущая страница",
      nextPage: "Следующая страница",
      selectAll: "Выбрать все строки на странице",
      selectRow: "Выбрать строку",
      expandRow: "Развернуть строку",
      collapseRow: "Свернуть строку",
    };
  },

  autocomplete: (code) => {
    const plural = createPlural(code);
    const number = createNumber(code);
    return {
      placeholder: "Выберите…",
      search: "Поиск…",
      clear: "Очистить выбор",
      remove: (label) => `Удалить ${label}`,
      empty: "Ничего не найдено",
      loading: "Загрузка…",
      minChars: (count) =>
        plural(count, {
          one: "Введите не менее {count} символа для поиска",
          few: "Введите не менее {count} символов для поиска",
          many: "Введите не менее {count} символов для поиска",
          other: "Введите не менее {count} символа для поиска",
        }),
      retry: "Повторить",
      create: (query) => `Создать «${query}»`,
      creating: "Создание…",
      more: (count) => `+${number(count)}`,
      loadMore: "Загрузить ещё",
      results: (count) =>
        plural(count, {
          one: "{count} результат",
          few: "{count} результата",
          many: "{count} результатов",
          other: "{count} результата",
        }),
    };
  },

  datePicker: (code) => {
    const plural = createPlural(code);
    return {
      placeholder: "Выберите дату",
      clear: "Очистить дату",
      previous: "Предыдущий месяц",
      next: "Следующий месяц",
      today: "Сегодня",
      month: "Месяц",
      year: "Год",
      dialog: "Выбор даты",
      count: (count) =>
        plural(count, {
          one: "Выбрана {count} дата",
          few: "Выбрано {count} даты",
          many: "Выбрано {count} дат",
          other: "Выбрано {count} даты",
        }),
      rangeStart: (from) => `${from} — …`,
      range: (from, to) => `${from} — ${to}`,
    };
  },

  fileUploader: (code) => {
    const plural = createPlural(code);
    return {
      title: "Перетащите сюда или выберите",
      // Same parts as the English hint: the accepted types, the size limit,
      // and the file limit only when more than one file is allowed.
      hint: ({ accept, maxSize, maxFiles }) =>
        [
          accept ? accept.replace(/,/g, ", ") : null,
          maxSize ? `до ${maxSize}` : null,
          maxFiles && maxFiles > 1
            ? plural(maxFiles, {
                one: "не более {count} файла",
                few: "не более {count} файлов",
                many: "не более {count} файлов",
                other: "не более {count} файла",
              })
            : null,
        ]
          .filter(Boolean)
          .join(" · "),
      dropHere: "Отпустите, чтобы добавить",
      browse: "Выбрать",
      dropzone: "Добавить файлы",
      remove: "Удалить файл",
      retry: "Повторить загрузку",
      cancel: "Отменить загрузку",
      progress: (name) => `Загрузка ${name}`,
      ready: "Готово к загрузке",
      uploading: "Загружается…",
      done: "Загружено",
      failed: "Ошибка",
      preview: (name) => `Предпросмотр: ${name}`,
      dismiss: "Скрыть",
      rejectedTitle: (count) =>
        plural(count, {
          one: "{count} файл не добавлен",
          few: "{count} файла не добавлены",
          many: "{count} файлов не добавлено",
          other: "{count} файла не добавлено",
        }),
    };
  },

  fileValidation: (code) => {
    const plural = createPlural(code);
    return {
      wrongType: (name) => `Тип файла ${name} не разрешён`,
      tooLarge: (name, max) => `Файл ${name} слишком большой (макс. ${max})`,
      tooSmall: (name, min) => `Файл ${name} слишком маленький (мин. ${min})`,
      tooMany: (max) =>
        plural(max, {
          one: "Можно добавить не более {count} файла",
          few: "Можно добавить не более {count} файлов",
          many: "Можно добавить не более {count} файлов",
          other: "Можно добавить не более {count} файла",
        }),
    };
  },
});
