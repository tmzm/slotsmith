// CommonJS: require each component's own entry.
const { Autocomplete } = require("slotsmith/autocomplete");
const { DatePicker } = require("slotsmith/date-picker");
const { FileUploader } = require("slotsmith/file-uploader");
const { SlotsmithProvider } = require("slotsmith/provider");
const { ar } = require("slotsmith/locales/ar");

// The table's entries, and the main entry "slotsmith" (it holds the table
// too), also require @tanstack/react-table.
const { DataTable } = require("slotsmith/data-table");
