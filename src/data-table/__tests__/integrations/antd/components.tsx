import { CaretDownOutlined, CaretUpOutlined, HolderOutlined, LeftOutlined, RightOutlined } from "@ant-design/icons";
import { Button, Checkbox, ConfigProvider, Empty, Flex, Segmented, Skeleton, Typography, theme } from "antd";
import type { GlobalToken } from "antd";
import { useContext, useId } from "react";
import {
  useDataTableContext,
  type CellSlotProps,
  type CheckboxSlotProps,
  type DataTableComponents,
  type DragHandleSlotProps,
  type EmptySlotProps,
  type ErrorSlotProps,
  type ExpandToggleSlotProps,
  type HeaderCellSlotProps,
  type PageSizeSelectSlotProps,
  type PaginationButtonSlotProps,
  type PaginationSlotProps,
  type RootSlotProps,
  type RowSlotProps,
  type SectionSlotProps,
  type SortIconSlotProps,
  type SortTriggerSlotProps,
  type TableSlotProps,
} from "../../../index";

/**
 * Ant Design table parts
 *
 * Built from Ant Design v6 primitives — `Button`, `Checkbox`, `Segmented`,
 * `Skeleton`, `Empty`, `Typography` — never from Ant's own `Table`, which is a
 * competing engine rather than a set of parts. Ant has no table primitives
 * below that `Table`, so the element slots are plain table elements dressed
 * in the theme's tokens, laid out like the built-in look.
 */

/**
 * Table sheet
 *
 * Ant components take no selector-based styles, and the rows change look with
 * the `data-*` attributes the table sets (`data-state`, `data-dragging`,
 * `data-drop-edge`), so the element slots are styled by one sheet built from
 * the theme's tokens. It is scoped to one table, so two tables under
 * different `ConfigProvider` themes keep their own colours.
 *
 * The root's `data-size` picks the cell padding of Ant's own tables: `sm`,
 * the data table's default, matches Ant's small table and `default` its
 * default one. `data-striped` tints every other body row. The stripe is
 * written with `:where()` so it weighs no more than the hover rule, and the
 * hover and selected tints that follow it still win.
 *
 * While a row is lifted (`data-dragging`), it and its visible sub-rows
 * (`data-dragging-child`) are drawn above the rows they pass, with opaque
 * cells so those rows never show through, and one shadow under the block.
 * With reduced motion nothing slides: the block is dimmed and a line on
 * `data-drop-edge` shows where it will land.
 *
 * @param scope - The class on this table's root.
 * @param token - The theme's tokens.
 * @returns The sheet's text.
 */
function tableSheet(scope: string, token: GlobalToken) {
  const s = `.${scope}`;
  const rule = `1px solid ${token.colorBorderSecondary}`;
  const lifted = `${s} tbody > tr[data-dragging]`;
  const child = `${s} tbody > tr[data-dragging-child]`;
  return `
${s} { width: 100%; overflow: hidden; color: ${token.colorText}; font-size: ${token.fontSize}px; background: ${token.colorBgContainer}; border: ${rule}; border-radius: ${token.borderRadiusLG}px; }
${s} > div { overflow: auto; }
${s} table { width: 100%; border-collapse: separate; border-spacing: 0; }
${s} th, ${s} td { padding: ${token.paddingXS + 2}px ${token.paddingSM}px; text-align: start; vertical-align: middle; border-bottom: ${rule}; }
${s}[data-size=sm] :is(th, td) { padding: ${token.paddingXS}px; }
${s}[data-size=default] :is(th, td) { padding: ${token.padding}px; }
${s} th { position: sticky; top: 0; z-index: 2; background-color: ${token.colorBgContainer}; font-weight: ${token.fontWeightStrong}; white-space: nowrap; }
${s} :is(th, td):is([data-slot=drag], [data-slot=select]) { width: 1%; padding-inline-end: 0; }
${s} tbody > tr:last-child > td { border-bottom: none; }
${s} tfoot td { font-weight: ${token.fontWeightStrong}; border-top: ${rule}; border-bottom: none; }
${s} tbody > tr > td { transition: background-color ${token.motionDurationMid}; }
${s}:where([data-striped]) tbody > tr:where(:nth-child(even)) > td { background-color: ${token.colorFillAlter}; }
${s} tbody > tr:hover > td { background-color: ${token.controlItemBgHover}; }
${s} tbody > tr[data-state=selected] > td { background-color: ${token.controlItemBgActive}; }
${s} tbody > tr[data-clickable] { cursor: pointer; }
${lifted}, ${child} { position: relative; z-index: 1; }
${lifted} > td, ${child} > td { background-color: ${token.colorBgContainer}; background-image: linear-gradient(${token.controlItemBgHover}, ${token.controlItemBgHover}); }
${lifted} { box-shadow: ${token.boxShadowSecondary}; }
${lifted}:has(+ tr[data-dragging-child]) { box-shadow: none; }
${child}:not(:has(+ tr[data-dragging-child])) { box-shadow: ${token.boxShadowSecondary}; }
@media (prefers-reduced-motion: reduce) {
  ${lifted}, ${child} { box-shadow: none !important; }
  ${lifted} > td, ${child} > td { opacity: 0.5; }
  ${s} tbody > tr[data-drop-edge=before] > td { box-shadow: inset 0 2px 0 0 ${token.colorPrimary}; }
  ${s} tbody > tr[data-drop-edge=after] > td { box-shadow: inset 0 -2px 0 0 ${token.colorPrimary}; }
}`;
}

/**
 * Ant root
 *
 * The bordered surface around the table and its pagination, carrying the
 * scoped sheet. `useId` gives each table its own scope; the characters React
 * wraps it in are not valid in a class name, so they are dropped. The sheet
 * carries the nonce from `ConfigProvider`'s `csp`, as Ant's own styles do,
 * so a strict Content Security Policy lets it through.
 */
function AntRoot({ className, children, ...props }: RootSlotProps) {
  const { token } = theme.useToken();
  const { csp } = useContext(ConfigProvider.ConfigContext);
  const scope = `ss-antd-table-${useId().replace(/[^\w-]/g, "")}`;
  return (
    <div className={className ? `${scope} ${className}` : scope} {...props}>
      <style nonce={csp?.nonce}>{tableSheet(scope, token)}</style>
      {children}
    </div>
  );
}

/**
 * Ant table elements
 *
 * Plain elements, styled by the root's sheet. Replacing the built-in ones
 * keeps slotsmith's own stylesheet, if the app loads it, off these cells.
 */
const AntTable = (props: TableSlotProps) => <table {...props} />;
const AntHead = (props: SectionSlotProps) => <thead {...props} />;
const AntBody = (props: SectionSlotProps) => <tbody {...props} />;
const AntFoot = (props: SectionSlotProps) => <tfoot {...props} />;
const AntRow = (props: RowSlotProps) => <tr {...props} />;
const AntHeaderCell = (props: HeaderCellSlotProps) => <th {...props} />;
const AntCell = (props: CellSlotProps) => <td {...props} />;

/**
 * Right-to-left
 *
 * @returns Whether the nearest `ConfigProvider` lays out right to left, so
 * arrows can point the way the page reads.
 */
const useRtl = () => useContext(ConfigProvider.ConfigContext).direction === "rtl";

/**
 * Ant drag handle
 *
 * A text `Button` with the `HolderOutlined` grip. Every slot prop goes to its
 * `<button>`: the ref, the pointer and key handlers, the `aria-*` attributes
 * and `disabled`. The HTML `type` moves to `htmlType`, since Ant's `type` is
 * the button's variant. `touch-action: none` keeps a touch drag from
 * scrolling the page instead of moving the row.
 */
const AntDragHandle = ({ type, style, ...props }: DragHandleSlotProps) => (
  <Button
    type="text"
    size="small"
    htmlType={type}
    icon={<HolderOutlined />}
    style={{ cursor: props["data-dragging"] === undefined ? "grab" : "grabbing", touchAction: "none", ...style }}
    {...props}
  />
);

/**
 * Ant checkbox adapter
 *
 * Ant's `Checkbox` has its own `indeterminate` prop and reports the change
 * on `event.target.checked`. The click is stopped so it does not also count
 * as a click on the row.
 */
const AntCheckbox = ({ checked, indeterminate, disabled, onCheckedChange, ...aria }: CheckboxSlotProps) => (
  <Checkbox
    checked={checked}
    indeterminate={indeterminate}
    disabled={disabled}
    onChange={(event) => onCheckedChange(event.target.checked)}
    onClick={(event) => event.stopPropagation()}
    aria-label={aria["aria-label"]}
  />
);

/**
 * Ant sort trigger
 *
 * A text `Button` holding the header and the `SortIcon` slot, pulled back by
 * its own padding so the header text lines up with the cells below.
 */
function AntSortTrigger({ direction, onClick, children }: SortTriggerSlotProps) {
  const { components } = useDataTableContext();
  const { token } = theme.useToken();
  return (
    <Button
      type="text"
      size="small"
      iconPlacement="end"
      icon={<components.SortIcon direction={direction} />}
      onClick={onClick}
      style={{ fontWeight: "inherit", marginInline: -token.paddingXS, paddingInline: token.paddingXS }}
    >
      {children}
    </Button>
  );
}

/**
 * Ant sort icon
 *
 * The stacked carets Ant's own table shows, the active one in the primary
 * colour. Hidden from assistive technology: `aria-sort` on the header
 * already says which way the column is sorted.
 */
function AntSortIcon({ direction }: SortIconSlotProps) {
  const { token } = theme.useToken();
  const tint = (active: boolean) => ({ color: active ? token.colorPrimary : token.colorTextQuaternary });
  return (
    <span aria-hidden="true" style={{ display: "inline-flex", flexDirection: "column", fontSize: token.fontSizeSM - 2 }}>
      <CaretUpOutlined style={tint(direction === "asc")} />
      <CaretDownOutlined style={{ ...tint(direction === "desc"), marginTop: "-0.3em" }} />
    </span>
  );
}

/**
 * Ant expand toggle
 *
 * A text `Button` with a chevron that turns down when the row is open, and
 * points the way the page reads when it is closed.
 */
function AntExpandToggle({ expanded, onToggle, depth: _depth, ...aria }: ExpandToggleSlotProps) {
  const rtl = useRtl();
  const Chevron = rtl ? LeftOutlined : RightOutlined;
  return (
    <Button
      type="text"
      size="small"
      aria-expanded={expanded}
      icon={<Chevron rotate={expanded ? (rtl ? -90 : 90) : 0} />}
      onClick={(event) => {
        event.stopPropagation();
        onToggle();
      }}
      {...aria}
    />
  );
}

/**
 * Ant skeleton
 *
 * An active `Skeleton.Input` in every cell, the shimmering bars of the
 * built-in look drawn by Ant.
 */
const AntSkeleton = () => <Skeleton.Input active size="small" block />;

/**
 * Ant empty state
 *
 * Ant's simple `Empty` picture over the message.
 */
const AntEmpty = ({ message }: EmptySlotProps) => <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={message} />;

/**
 * Ant error state
 *
 * The message in the danger colour and a retry `Button`, announced as an
 * alert like the built-in one.
 */
function AntError({ message, retryLabel, onRetry }: ErrorSlotProps) {
  const { token } = theme.useToken();
  return (
    <Flex vertical align="center" gap="small" role="alert" style={{ paddingBlock: token.paddingLG }}>
      <Typography.Text type="danger">{message}</Typography.Text>
      {onRetry && (
        <Button size="small" onClick={onRetry}>
          {retryLabel}
        </Button>
      )}
    </Flex>
  );
}

/**
 * Ant pagination button
 *
 * A `Button` with a chevron that points the way the page reads.
 */
function AntPaginationButton({ direction, ...props }: PaginationButtonSlotProps) {
  const backwards = (direction === "previous") !== useRtl();
  return <Button size="small" icon={backwards ? <LeftOutlined /> : <RightOutlined />} {...props} />;
}

/**
 * Ant page-size select
 *
 * A `Segmented` control over the handful of page sizes, named by the visible
 * label beside it.
 */
function AntPageSizeSelect({ value, options, onValueChange, label }: PageSizeSelectSlotProps) {
  const id = useId();
  return (
    <Flex align="center" gap="small">
      <Typography.Text type="secondary" id={id}>
        {label}
      </Typography.Text>
      <Segmented<number> size="small" aria-labelledby={id} options={options} value={value} onChange={onValueChange} />
    </Flex>
  );
}

/**
 * Ant pagination
 *
 * The built-in bar's layout — previous and next, the page info, the page
 * size — under a hairline, composing the `PaginationButton` and
 * `PageSizeSelect` slots so either can still be swapped on its own.
 */
function AntPagination({ labels, ...props }: PaginationSlotProps) {
  const { components } = useDataTableContext();
  const { token } = theme.useToken();
  return (
    <Flex
      component="nav"
      aria-label={labels.pagination}
      wrap
      align="center"
      justify="space-between"
      gap="small"
      style={{ padding: `${token.paddingXS}px ${token.paddingSM}px`, borderTop: `1px solid ${token.colorBorderSecondary}` }}
    >
      <Flex gap="small">
        <components.PaginationButton
          direction="previous"
          disabled={!props.canPreviousPage}
          onClick={props.previousPage}
          aria-label={labels.previousPage}
        />
        <components.PaginationButton
          direction="next"
          disabled={!props.canNextPage}
          onClick={props.nextPage}
          aria-label={labels.nextPage}
        />
      </Flex>
      <Typography.Text type="secondary" aria-live="polite">
        {labels.pageInfo(props.pageIndex + 1, props.pageCount)}
      </Typography.Text>
      <components.PageSizeSelect
        value={props.pageSize}
        options={props.pageSizeOptions}
        onValueChange={props.setPageSize}
        label={labels.rowsPerPage}
      />
    </Flex>
  );
}

/**
 * Ant Design components
 *
 * The slot map an Ant Design v6 project would pass as `components`.
 */
export const antdComponents: Partial<DataTableComponents> = {
  Root: AntRoot,
  Table: AntTable,
  Head: AntHead,
  Body: AntBody,
  Foot: AntFoot,
  HeaderRow: AntRow,
  Row: AntRow,
  FooterRow: AntRow,
  HeaderCell: AntHeaderCell,
  Cell: AntCell,
  FooterCell: AntCell,
  Checkbox: AntCheckbox,
  SortTrigger: AntSortTrigger,
  SortIcon: AntSortIcon,
  ExpandToggle: AntExpandToggle,
  Skeleton: AntSkeleton,
  Empty: AntEmpty,
  Error: AntError,
  Pagination: AntPagination,
  PaginationButton: AntPaginationButton,
  PageSizeSelect: AntPageSizeSelect,
  DragHandle: AntDragHandle,
};
