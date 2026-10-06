import { render, screen } from "@testing-library/react";
import { memo, useContext, type ReactElement } from "react";
import { describe, expect, it } from "vitest";
import { Autocomplete } from "../../autocomplete/Autocomplete";
import { useAutocompleteContext } from "../../autocomplete/slots/context";
import type { AutocompleteComponents } from "../../autocomplete/slots/types";
import { DataTable } from "../../data-table/DataTable";
import { useDataTableContext } from "../../data-table/slots/context";
import type { DataTableComponents, EmptySlotProps } from "../../data-table/slots/types";
import { DatePicker } from "../../date-picker/DatePicker";
import { useDatePickerContext } from "../../date-picker/slots/context";
import type { DatePickerComponents } from "../../date-picker/slots/types";
import { FileUploader } from "../../file-uploader/FileUploader";
import { useFileUploaderContext } from "../../file-uploader/slots/context";
import type { FileUploaderComponents } from "../../file-uploader/slots/types";
import type { SlotsmithComponents } from "../components";
import { SlotsmithContext, SlotsmithProvider } from "../context";

/**
 * Marker
 *
 * Builds a widget slot that renders nothing but a test id, so a test can tell
 * which layer supplied the slot.
 *
 * @param id - The test id to render.
 * @returns The slot component.
 */
const marker = (id: string) => {
  const Marker = () => <span data-testid={id} />;
  return Marker;
};

const ProviderEmpty = ({ message }: EmptySlotProps) => <span data-testid="provider-empty">{message}</span>;
const ProviderIndicator = marker("provider-indicator");
const ProviderDateIcon = marker("provider-date-icon");
const ProviderUploadIcon = marker("provider-upload-icon");

/** One override per component, the way an app sets them once at its root. */
const everywhere: SlotsmithComponents = {
  dataTable: { Empty: ProviderEmpty },
  autocomplete: { Indicator: ProviderIndicator },
  datePicker: { Icon: ProviderDateIcon },
  fileUploader: { Icon: ProviderUploadIcon },
};

const columns = [{ accessorKey: "name", header: "Name" }];

/**
 * Cases
 *
 * Each component in its default layout and in its compound one, with the slot
 * the provider replaces, the same slot set on the component itself, and a
 * fallback class that must survive untouched.
 */
const CASES: {
  name: string;
  providerId: string;
  ownId: string;
  fallback: string;
  whole: (own?: boolean) => ReactElement;
  compound: () => ReactElement;
}[] = [
  {
    name: "DataTable",
    providerId: "provider-empty",
    ownId: "own",
    fallback: "table.sdt__table",
    whole: (own) => (
      <DataTable data={[]} columns={columns} components={own ? { Empty: marker("own") } : undefined} />
    ),
    compound: () => (
      <DataTable.Provider data={[]} columns={columns}>
        <DataTable.Root>
          <DataTable.Table />
        </DataTable.Root>
      </DataTable.Provider>
    ),
  },
  {
    name: "Autocomplete",
    providerId: "provider-indicator",
    ownId: "own",
    fallback: ".sac__trigger",
    whole: (own) => <Autocomplete options={[]} components={own ? { Indicator: marker("own") } : undefined} />,
    compound: () => (
      <Autocomplete.Provider options={[]}>
        <Autocomplete.Root>
          <Autocomplete.Trigger />
        </Autocomplete.Root>
      </Autocomplete.Provider>
    ),
  },
  {
    name: "DatePicker",
    providerId: "provider-date-icon",
    ownId: "own",
    fallback: ".sdp__trigger",
    whole: (own) => <DatePicker components={own ? { Icon: marker("own") } : undefined} />,
    compound: () => (
      <DatePicker.Provider>
        <DatePicker.Root>
          <DatePicker.Trigger />
        </DatePicker.Root>
      </DatePicker.Provider>
    ),
  },
  {
    name: "FileUploader",
    providerId: "provider-upload-icon",
    ownId: "own",
    fallback: ".sfu__zone",
    whole: (own) => <FileUploader components={own ? { Icon: marker("own") } : undefined} />,
    compound: () => (
      <FileUploader.Provider>
        <FileUploader.Root>
          <FileUploader.Dropzone />
        </FileUploader.Root>
      </FileUploader.Provider>
    ),
  },
];

describe("SlotsmithProvider components", () => {
  it.each(CASES)("replaces a $name slot for every one below it", ({ whole, providerId }) => {
    render(<SlotsmithProvider components={everywhere}>{whole()}</SlotsmithProvider>);
    expect(screen.getByTestId(providerId)).toBeInTheDocument();
  });

  it.each(CASES)("lets $name's own components prop win, slot by slot", ({ whole, providerId, ownId }) => {
    render(<SlotsmithProvider components={everywhere}>{whole(true)}</SlotsmithProvider>);
    expect(screen.getByTestId(ownId)).toBeInTheDocument();
    expect(screen.queryByTestId(providerId)).not.toBeInTheDocument();
  });

  it.each(CASES)("keeps $name's other slots on their fallbacks", ({ whole, fallback }) => {
    const { container } = render(<SlotsmithProvider components={everywhere}>{whole()}</SlotsmithProvider>);
    expect(container.querySelector(fallback)).toBeInTheDocument();
  });

  it.each(CASES)("reaches $name's compound parts through its Provider", ({ compound, providerId }) => {
    render(<SlotsmithProvider components={everywhere}>{compound()}</SlotsmithProvider>);
    expect(screen.getByTestId(providerId)).toBeInTheDocument();
  });

  it.each(CASES)("changes nothing for $name when it sets no components", ({ whole, providerId }) => {
    /** `useId` counts across renders, so the ids are the one thing that may differ. */
    const markup = (node: Element) => node.innerHTML.replace(/_r_\w+_/g, "_id_");
    const bare = render(whole());
    const html = markup(bare.container);
    bare.unmount();

    const { container } = render(<SlotsmithProvider components={{}}>{whole()}</SlotsmithProvider>);
    expect(markup(container)).toBe(html);
    expect(screen.queryByTestId(providerId)).not.toBeInTheDocument();
  });

  it("treats an undefined slot as not set, so the layer below shows through", () => {
    render(
      <SlotsmithProvider components={everywhere}>
        <SlotsmithProvider components={{ dataTable: { Empty: undefined } }}>
          <DataTable data={[]} columns={columns} components={{ Empty: undefined }} />
        </SlotsmithProvider>
      </SlotsmithProvider>,
    );
    expect(screen.getByTestId("provider-empty")).toBeInTheDocument();
  });

  it("hands the merged slots to each component's context hook", () => {
    const seen: Record<string, unknown> = {};
    function TableProbe() {
      seen.dataTable = useDataTableContext().components.Empty;
      return null;
    }
    function AutocompleteProbe() {
      seen.autocomplete = useAutocompleteContext().components.Indicator;
      return null;
    }
    function DatePickerProbe() {
      seen.datePicker = useDatePickerContext().components.Icon;
      return null;
    }
    function UploaderProbe() {
      seen.fileUploader = useFileUploaderContext().components.Icon;
      return null;
    }
    render(
      <SlotsmithProvider components={everywhere}>
        <DataTable.Provider data={[]} columns={columns}><TableProbe /></DataTable.Provider>
        <Autocomplete.Provider options={[]}><AutocompleteProbe /></Autocomplete.Provider>
        <DatePicker.Provider><DatePickerProbe /></DatePicker.Provider>
        <FileUploader.Provider><UploaderProbe /></FileUploader.Provider>
      </SlotsmithProvider>,
    );
    expect(seen).toEqual({
      dataTable: ProviderEmpty,
      autocomplete: ProviderIndicator,
      datePicker: ProviderDateIcon,
      fileUploader: ProviderUploadIcon,
    });
  });
});

describe("nested providers", () => {
  const InnerSkeleton = marker("inner-skeleton");
  const InnerEmpty = marker("inner-empty");
  const OuterSkeleton = marker("outer-skeleton");

  /** Reads the merged map back, the way a component does. */
  function Merged({ onRead }: { onRead: (components: SlotsmithComponents) => void }) {
    onRead(useContext(SlotsmithContext).components);
    return null;
  }

  it("merges slot by slot, the inner provider winning", () => {
    let merged: SlotsmithComponents = {};
    render(
      <SlotsmithProvider components={{ dataTable: { Empty: ProviderEmpty, Skeleton: OuterSkeleton } }}>
        <SlotsmithProvider components={{ dataTable: { Skeleton: InnerSkeleton } }}>
          <Merged onRead={(value) => (merged = value)} />
          <DataTable data={[]} columns={columns} />
        </SlotsmithProvider>
      </SlotsmithProvider>,
    );
    expect(merged.dataTable).toEqual({ Empty: ProviderEmpty, Skeleton: InnerSkeleton });
    expect(screen.getByTestId("provider-empty")).toBeInTheDocument();
  });

  it("inherits the components an inner provider does not name", () => {
    let merged: SlotsmithComponents = {};
    render(
      <SlotsmithProvider components={everywhere}>
        <SlotsmithProvider components={{ dataTable: { Empty: InnerEmpty } }}>
          <Merged onRead={(value) => (merged = value)} />
          <DataTable data={[]} columns={columns} />
          <DatePicker />
        </SlotsmithProvider>
      </SlotsmithProvider>,
    );
    expect(merged.dataTable).toEqual({ Empty: InnerEmpty });
    expect(merged.autocomplete).toBe(everywhere.autocomplete);
    expect(merged.fileUploader).toBe(everywhere.fileUploader);
    expect(screen.getByTestId("inner-empty")).toBeInTheDocument();
    expect(screen.getByTestId("provider-date-icon")).toBeInTheDocument();
  });

  it("inherits everything through a provider that only sets the language", () => {
    let merged: SlotsmithComponents = {};
    render(
      <SlotsmithProvider components={everywhere}>
        <SlotsmithProvider locale="en-GB">
          <Merged onRead={(value) => (merged = value)} />
        </SlotsmithProvider>
      </SlotsmithProvider>,
    );
    expect(merged).toBe(everywhere);
  });
});

describe("context identity", () => {
  it("is stable across re-renders while the props are", () => {
    let renders = 0;
    const values = new Set<unknown>();
    const Consumer = memo(function Consumer() {
      renders += 1;
      values.add(useContext(SlotsmithContext));
      values.add(useContext(SlotsmithContext).components.dataTable);
      return null;
    });
    const inner: SlotsmithComponents = { dataTable: { Skeleton: marker("skeleton") } };
    const tree = (
      <SlotsmithProvider components={everywhere}>
        <SlotsmithProvider components={inner}>
          <Consumer />
        </SlotsmithProvider>
      </SlotsmithProvider>
    );
    const { rerender } = render(tree);
    rerender(
      <SlotsmithProvider components={everywhere}>
        <SlotsmithProvider components={inner}>
          <Consumer />
        </SlotsmithProvider>
      </SlotsmithProvider>,
    );
    rerender(
      <SlotsmithProvider components={everywhere}>
        <SlotsmithProvider components={inner}>
          <Consumer />
        </SlotsmithProvider>
      </SlotsmithProvider>,
    );
    expect(renders).toBe(1);
    expect(values.size).toBe(2);
  });

  it("gives a component the same slots object on every render", () => {
    const seen = new Set<unknown>();
    function Probe() {
      seen.add(useDataTableContext().components);
      return null;
    }
    const data: { name: string }[] = [];
    const tree = () => (
      <SlotsmithProvider components={everywhere}>
        <DataTable.Provider data={data} columns={columns}><Probe /></DataTable.Provider>
      </SlotsmithProvider>
    );
    const { rerender } = render(tree());
    rerender(tree());
    expect(seen.size).toBe(1);
  });
});

/**
 * Types
 *
 * Never rendered: the compiler is the assertion. Each key takes the map its
 * component's own `components` prop takes, and nothing else.
 */
export function TypeChecks() {
  const table: Partial<DataTableComponents> = {};
  const autocomplete: Partial<AutocompleteComponents<{ id: string }>> = {};
  const datePicker: Partial<DatePickerComponents> = {};
  const fileUploader: Partial<FileUploaderComponents> = {};
  return (
    <>
      <SlotsmithProvider components={{ dataTable: table, autocomplete, datePicker, fileUploader }} />
      {/* @ts-expect-error — the table has no `Day` slot. */}
      <SlotsmithProvider components={{ dataTable: { Day: ProviderEmpty } }} />
      {/* @ts-expect-error — `Empty` receives a message, not a checkbox's props. */}
      <SlotsmithProvider components={{ dataTable: { Empty: (props: { checked: boolean }) => <i>{String(props.checked)}</i> } }} />
      {/* @ts-expect-error — a slot is a component, not an element. */}
      <SlotsmithProvider components={{ datePicker: { Icon: <span /> } }} />
      {/* @ts-expect-error — there is no such component. */}
      <SlotsmithProvider components={{ tooltip: {} }} />
      {/* @ts-expect-error — a date picker map is not a file uploader map. */}
      <SlotsmithProvider components={{ fileUploader: { Day: ProviderDateIcon } }} />
    </>
  );
}
