import { defineLocale } from "../locale/defineLocale";
import { createNumber, createPlural } from "../locale/plural";

/**
 * Portuguese, Brazil
 *
 * Labels for every component, in Brazilian spelling and vocabulary
 * ("arquivo", "carregando").
 *
 * Drafted from the English labels; corrections from native speakers are welcome.
 *
 * @example
 * ```tsx
 * import { ptBR } from "slotsmith/locales/pt-BR";
 *
 * <DataTable locale={ptBR} data={rows} columns={columns} />;
 * ```
 */
export const ptBR = defineLocale({
  code: "pt-BR",
  dir: "ltr",

  table: (code) => {
    const number = createNumber(code);
    return {
      empty: "Nenhum dado encontrado",
      error: "Ocorreu um erro ao carregar os dados.",
      retry: "Tentar novamente",
      rowsPerPage: "Linhas por página",
      pageInfo: (page, pageCount) => `Página ${number(page)} de ${number(pageCount)}`,
      pagination: "Paginação",
      previousPage: "Página anterior",
      nextPage: "Próxima página",
      selectAll: "Selecionar todas as linhas desta página",
      selectRow: "Selecionar linha",
      expandRow: "Expandir linha",
      collapseRow: "Recolher linha",
      reorderRow: "Reordenar linha",
      reorderInstructions:
        "Pressione espaço para levantar a linha, as setas para movê-la, espaço para soltá-la e Esc para cancelar.",
      reorderLifted: (position, total) => `Linha levantada. Posição ${number(position)} de ${number(total)}.`,
      reorderMoved: (position, total) => `Posição ${number(position)} de ${number(total)}.`,
      reorderDropped: (position, total) => `Linha solta na posição ${number(position)} de ${number(total)}.`,
      reorderCancelled: "Reordenação cancelada.",
    };
  },

  autocomplete: (code) => {
    const plural = createPlural(code);
    const number = createNumber(code);
    return {
      placeholder: "Selecionar…",
      search: "Pesquisar…",
      clear: "Limpar seleção",
      remove: (label) => `Remover ${label}`,
      empty: "Nenhum resultado",
      loading: "Carregando…",
      minChars: (count) =>
        plural(count, {
          one: "Digite pelo menos {count} caractere para pesquisar",
          other: "Digite pelo menos {count} caracteres para pesquisar",
        }),
      retry: "Tentar novamente",
      create: (query) => `Criar “${query}”`,
      creating: "Criando…",
      more: (count) => `+${number(count)}`,
      loadMore: "Carregar mais",
      results: (count) =>
        plural(count, {
          one: "{count} resultado",
          other: "{count} resultados",
        }),
    };
  },

  datePicker: (code) => {
    const plural = createPlural(code);
    return {
      placeholder: "Selecionar data",
      clear: "Limpar data",
      previous: "Mês anterior",
      next: "Próximo mês",
      today: "Ir para hoje",
      month: "Mês",
      year: "Ano",
      dialog: "Escolher uma data",
      count: (count) =>
        plural(count, {
          one: "{count} data selecionada",
          other: "{count} datas selecionadas",
        }),
      rangeStart: (from) => `${from} — …`,
      range: (from, to) => `${from} — ${to}`,
    };
  },

  fileUploader: (code) => {
    const plural = createPlural(code);
    return {
      title: "Arraste e solte, ou procure",
      // Same parts as the English hint: the accepted types, the size limit,
      // and the file limit only when more than one file is allowed.
      hint: ({ accept, maxSize, maxFiles }) =>
        [
          accept ? accept.replace(/,/g, ", ") : null,
          maxSize ? `até ${maxSize}` : null,
          maxFiles && maxFiles > 1 ? plural(maxFiles, { other: "máx. {count} arquivos" }) : null,
        ]
          .filter(Boolean)
          .join(" · "),
      dropHere: "Solte para adicionar",
      browse: "Procurar",
      dropzone: "Adicionar arquivos",
      remove: "Remover arquivo",
      retry: "Tentar enviar novamente",
      cancel: "Cancelar envio",
      progress: (name) => `Enviando ${name}`,
      ready: "Pronto",
      uploading: "Enviando…",
      done: "Enviado",
      failed: "Falhou",
      preview: (name) => `Pré-visualização de ${name}`,
      dismiss: "Fechar",
      rejectedTitle: (count) =>
        plural(count, {
          one: "{count} arquivo não adicionado",
          other: "{count} arquivos não adicionados",
        }),
    };
  },

  fileValidation: (code) => {
    const plural = createPlural(code);
    return {
      wrongType: (name) => `${name} não é um tipo de arquivo permitido`,
      tooLarge: (name, max) => `${name} é grande demais (máx. ${max})`,
      tooSmall: (name, min) => `${name} é pequeno demais (mín. ${min})`,
      tooMany: (max) =>
        plural(max, {
          one: "Só é permitido {count} arquivo",
          other: "Só são permitidos {count} arquivos",
        }),
    };
  },
});
