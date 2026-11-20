---
title: File drop overlay
description: Take files dropped anywhere in the window, or contained in a dialog or region, with an overlay that says what dropping does.
component: ZFileDropOverlay
---

`ZFileDropOverlay` lets a page take files dropped anywhere on it, not only on a drop box. While files are dragged over the window, an overlay covers it and says what dropping does. The drop hands back the files: the ones `accept` takes in `@drop`, the rest in `@rejected`. Nuxt UI's `UFileUpload` is the drop box; this is the whole page. Put one in the page, or the layout, that should take the files.

```vue
<ZFileDropOverlay accept="image/*,.pdf" multiple label="Drop receipts to attach them" @drop="attach" @rejected="warn" />
```

## Contained in a region

`target` takes drops in one element instead of the window: an element, a template ref to one, a component, or a selector (looked up when the overlay mounts, so use a template ref for an element rendered later). The overlay is then drawn inside that element, over it, so it sits in the element's own stacking context and needs no measuring. If the element isn't positioned, it is made `position: relative` while the overlay is attached, and put back after. Drag a file from your desktop onto the box below.

::component-example{name="FileDropOverlayRegion"}
::

## In a dialog

Give the dialog's content as the `target`, and the whole dialog takes drops, with the overlay drawn over the dialog's content and inside its interactive layer. Here the Files field lists what the transfer already holds and what is being added, in one [`ZFileList`](/components/file-list), with Nuxt UI's `UFileUpload` under it to browse. Dropped and browsed files go through the same rule, and what it refuses is reported in a toast.

::component-example{name="FileDropOverlayDialog"}
::

- **One rule for every file.** `sortDroppedFiles(files, { accept, multiple: true })` sorts what the overlay hands over and what `UFileUpload` hands over alike. `UFileUpload`'s own drop check reads only the MIME types out of `accept` (`.pdf` and `.csv` are ignored there), so route its `update:model-value` through the same function rather than binding its `v-model` straight to the list.
- **No drop counted twice.** A drop that lands on a drop zone that takes it, such as the field's `UFileUpload`, is left to that zone: the overlay doesn't emit it again. One the zone refuses is the overlay's.
- **No file twice.** Pass the names the list holds as `existing`, and a file already attached is refused as `duplicate`.
- **Browsing again.** Give the `UFileUpload` `reset`, so a file removed from the list can be picked again: without it, the input still holds the last pick, and the browser sends no change for the same file chosen twice.
- **Reporting what's refused.** `@rejected` gets each file with its reason, ready for a toast:

```ts
const toast = useToast()
function report(rejected: RejectedFile[]) {
  toast.add({ title: 'Not attached', description: `${rejected.map((r) => r.file.name).join(', ')}: only PDFs and images.`, color: 'error' })
}
```

## Nested overlays

A page can keep its window-level overlay while a dialog or region inside it has its own, with nothing to wire up.

- **In a modal dialog,** the dialog holds the page. While an overlay is contained in an open modal (a `<dialog>` opened with `showModal()`, an `aria-modal` dialog, or a reka-ui modal such as Nuxt UI's `UModal` and `USlideover`), every overlay outside it stands down, as if disabled: nothing shows over the backdrop or the page behind it, nothing is emitted there, and a file dropped there is still kept from opening in the tab. When the dialog closes, the page's overlay works again.
- **In a region on the page,** not modal, the innermost overlay under the pointer wins: drag over the region and the region's shows; drag back onto the page and the page's does.

## What it takes

- **`accept`** is the native input's: MIME types (`application/pdf`), a family (`image/*`) and extensions (`.csv`), comma-separated or as a list. Without it, every file is taken.
- **`multiple`** takes every matching file. Without it, the first is taken and the others are refused.
- **`filter`** is a rule of your own, run on each file `accept` takes: return `true` to take it, or `false` or a message to refuse it. A size limit reads `(file) => file.size <= 25_000_000 || 'is over 25 MB'`.
- **`@rejected`** gets each refused file with its reason: `accept` (its type isn't taken), `filter` (your rule refused it, with its message) or `multiple` (it came after the first). Nothing is dropped silently. `@drop` and `@rejected` fire only when they have files.

`sortDroppedFiles(files, { accept, multiple, filter, existing })` and `fileMatchesAccept(file, accept)` are auto-imported, so your own inputs can follow the same rule. `existing` is the names a list already holds: a file of one of those names is refused as `duplicate`, so nothing is attached twice (`dedupe: 'name'` also refuses a name repeated within one drop). The files of a drop are read from `dataTransfer.files`, or from `dataTransfer.items` when a browser leaves `files` empty; `droppedFiles(dataTransfer)` does the same for your own drop zones.

## When it shows

- **Only for files.** Text, links and elements dragged within the page don't bring it up.
- **No flicker.** The drag is counted across every element it crosses, so the overlay doesn't blink as it passes over the page's children.
- **Hiding.** It goes when the drag leaves the window (or the target) or the files are dropped. Escape hides it for the rest of that drag.
- **`disabled`** shows nothing and emits nothing. A file dropped on the page is still kept from opening in the tab, and a drop zone under it still gets its drop.

The overlay is drawn over everything, on Nuxt UI's `bg-default` and `bg-elevated`, in the product's colors in light and dark. It fades in with its message growing into place, and fades out, with no motion when the visitor asks for reduced motion. It is only a picture: the pointer passes through it, so drop zones under it still work. Change its words with `label` (`Drop your files` by default) and `description`, give it an icon with `icon` (`i-lucide-upload`, say; none by default), or replace the message with the default slot. Attributes such as `class` go on the overlay.

## Accessibility

A polite live region announces the `label` as the overlay appears. The overlay is hidden from assistive tech and holds nothing focusable, so focus stays where it was and isn't trapped.
