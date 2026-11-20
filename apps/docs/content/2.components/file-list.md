---
title: File list
description: The files a form holds, one row each, whether just added or already stored, with an async remove.
component: ZFileList
preview: FileListStored
---

`ZFileList` lists the files a form holds: a file-type icon, the name, the size in the locale's own words (`245 kB`, `1,8 MB` in German), and a Remove button. A row is a `File` just picked or dropped, or a file already on the server, given as `{ id, name, size, type }`. That is what an edit form needs: what was sent before and what is being added, in one list. Nuxt UI's `UFileUpload` lists only the `File`s it holds itself, so it can't show what is already stored.

::component-example{name="FileListStored"}
::

## Removing

`remove` is called with the row and its index. It may return a promise, a server delete say: the row shows a spinner, is marked busy, and its button is disabled until the promise settles. If it rejects, the row stays as it was and `@remove-error` gets the error and the row, for the product's toast. Without `remove`, there are no Remove buttons.

```vue
<ZFileList
  :items="[...stored, ...added]"
  :remove="(item) => (item instanceof File ? (added = added.filter((f) => f !== item)) : api.deleteFile(item.id))"
  @remove-error="(error, item) => toast.add({ title: `Couldn't remove ${item.name}`, color: 'error' })"
/>
```

## With a file drop

In a dialog, `ZFileList` is the list and [`ZFileDropOverlay`](/components/file-drop-overlay#in-a-dialog) takes the drops, with `UFileUpload` under the list to browse.

`formatFileSize(bytes, locale)` is auto-imported: decimal units (1 kB is 1000 bytes), one decimal under 10.
