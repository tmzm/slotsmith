# File uploader guide

Drop or browse files, validate them, preview images, and upload with progress, retry and cancellation, or leave `upload` out and it is a picker that never touches the network.

```bash
npm i slotsmith
```

## Picker only

Without `upload`, nothing is sent and items stay `ready`. Read the files with `onFilesChange`:

```tsx
import { FileUploader } from "slotsmith/file-uploader";
import "slotsmith/file-uploader.css";

<FileUploader multiple accept="image/*" maxSize={5 * 1024 * 1024} onFilesChange={setFiles} />;
```

## Uploading

`upload` sends one file and resolves with the URL to keep. It receives an abort `signal` and an `onProgress` callback, so cancellation and progress bars work with `fetch`, axios or a presigned PUT:

```tsx
const upload = async (file: File, { signal, onProgress }) => {
  const form = new FormData();
  form.append("file", file);
  const res = await axios.post("/files/upload", form, {
    signal,
    onUploadProgress: (e) => e.total && onProgress((e.loaded / e.total) * 100),
  });
  return { url: res.data.url };
};

<FileUploader multiple upload={upload} onUrlsChange={setUrls} />;
```

Uploads start as soon as files are picked (`autoUpload`, default `true`), at most `concurrency` at a time (default `3`). Failed items offer retry; in-flight items offer cancel.

## Value

The canonical value is a list of `UploadItem`s (`value` / `onValueChange`). `defaultValue` also accepts `File[]` or URL strings, which is how an edit form shows files that were uploaded earlier: `defaultValue={user.photos}`.

## Validation

`accept`, `maxSize`, `minSize`, `maxFiles` and a custom `validate` turn files away before they become items. Rejections are listed in the component and reported through `onReject`; reword them with `validationLabels`.

## Variants

`variant` chooses the layout: `dropzone` (default), `tile` (one square whose preview replaces the zone, for avatars and cover images) or `compact` (a button and an inline list, for tight forms). `hideList` hides the item list when you render the files yourself.

## Replacing parts

`Root`, `Dropzone`, `Input`, `List` and `Item` are element parts; the drop zone carries `data-dragging` while files are dragged over it, and items carry `data-status` and `data-image`. `Thumbnail`, `ItemMeta`, `Progress`, `Action` and `Rejections` are widget parts.

## Long lists

`VirtualFileUploader` from `slotsmith/virtual` windows the item list (needs `@tanstack/react-virtual`).
