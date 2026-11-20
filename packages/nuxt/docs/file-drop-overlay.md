# ZFileDropOverlay

Files dropped anywhere in the window, or contained in a dialog or region (`components/FileDropOverlay.vue`), with its
sorting rule in `utils/file-drop.ts`; `ZFileList` (`components/FileList.vue`, [below](#zfilelist)) lists the files a
form holds. Nuxt UI's `UFileUpload` takes a drop on its box; this takes one on the page. While files are dragged over
it an overlay says what dropping does, and the drop hands the files back.

```vue
<ZFileDropOverlay accept="image/*,.pdf" multiple label="Drop receipts to attach them" @drop="attach" @rejected="warn" />
<ZFileDropOverlay :target="regionEl" accept=".csv" label="Drop a CSV to import it" @drop="([file]) => importCsv(file)" />
```

**Why the name.** Zoo UI names a component for what it is on screen: `ZFileDropOverlay` is the overlay a file drop
brings up. Not "fullscreen", which reads as the Fullscreen API, and not "drop zone", which is `UFileUpload`'s box.

| Prop | | |
| --- | --- | --- |
| `accept` | `string \| string[]` | The native input's syntax: `application/pdf`, `image/*`, `.csv`, comma-separated or a list. Unset (or with no valid token), every file is taken. |
| `multiple` | `boolean` | Take every matching file. Without it (the default, as on the native input), the first is taken and later matches are refused as `multiple`. |
| `disabled` | `boolean` | No overlay and no emits; a file drag over the page still gets `dropEffect = 'none'` and a drop is kept from opening the file in the tab. |
| `label` | `string` | The overlay's message and what the live region announces (`Drop files here`). |
| `description` | `string` | A second, muted line. |
| `icon` | `string \| false` | `i-lucide-upload` (in `Z_ICONS`); `false` for none. |
| `target` | `HTMLElement \| { $el } \| string \| null` | Contain it in this element: drops there only, with the overlay drawn inside it. An element or template ref, a component, or a selector. `null` takes nothing (a ref not set yet); unset is the window. A selector is looked up at mount, so for an element rendered later (a dialog's content, a `v-if`) pass a template ref, which is followed as it changes. |

| Emit | |
| --- | --- |
| `drop(files: File[])` | The files taken, in drop order. Only when there is at least one. |
| `rejected(files: RejectedFile[])` | `{ file, reason: 'accept' \| 'multiple' }` for each file refused. Only when there is at least one. |

The default slot replaces the icon, label and description, with `{ label, accept, multiple }`. Attributes (`class`,
`data-*`) go on the overlay, not on the live region. Exposed: `visible` (a computed boolean) and `dismiss()`, which
hides the overlay for the rest of the drag as Escape does.

**Counting.** `dragenter` and `dragleave` fire on every element the pointer crosses, enter on the new one before leave
on the old, so the overlay is up while the count is above zero; the page's children can't make it flicker. Only drags
whose `dataTransfer.types` has `Files` are counted: text, links and elements dragged within the page are left alone,
with no preventDefault, so the page's own drag and drop is untouched. A drop anywhere, or the count reaching zero
(the drag left the window), ends the drag. The overlay is only a picture, `pointer-events: none`: the drag's events
stay on the page's own elements, so showing or hiding it never takes an element from under the pointer (whose
`dragleave` would never come, and the count would stick), and a drop zone under it still gets its events. Dismissed
(Escape) or disabled, it is simply not drawn.

**Contained.** Whenever `target` is set, the overlay is contained in it: the listeners go on that element instead of
`<html>`, and the overlay is teleported into it as `absolute inset-0` rather than to `<body>` as `fixed inset-0
z-50`. Not a separate prop: an overlay placed over a target from `<body>` sits in the wrong stacking context (behind a
dialog that portalled later) and outside a modal's interactive layer, so there is no case for it. A target that isn't
positioned is made `position: relative` while the overlay is attached, and its own `position` put back after. A drop
outside the target is the page's business, as it is without the component.

**Nesting: the innermost wins.** Every instance shares one `WeakSet` of drag events already claimed. A target's
listeners run before those of anything around it (an outer target, or `<html>`), so the innermost overlay claims each
event and the outer ones leave it alone, neither counting nor answering it. The count is split by region: the dialog's
overlay counts the drag over the dialog, the page's the drag over the rest, and each shows only while the pointer is
over its own; the drop goes to the one under it. A disabled overlay still claims, so the count stays whole when
`disabled` changes mid-drag, and a dialog's disabled overlay keeps the page's from taking drops over the dialog.

**A modal holds the page.** Innermost-wins is for regions. While an overlay is contained in an open modal, every
overlay outside that modal stands down, as if disabled: nothing shows over the backdrop or the page behind it,
nothing is emitted, and `dragover` there still gets `dropEffect = 'none'`, so a dropped file doesn't open in the tab.
A container is in an open modal when its nearest `dialog` / `[role="dialog"]` / `[role="alertdialog"]` is a
`<dialog>` matching `:modal` (opened with `showModal()`), has `aria-modal="true"`, or has the rest of the page hidden
from assistive tech with `data-aria-hidden`, which is how reka-ui marks its modals (Nuxt UI's `UModal`, `USlideover`):
it sets that on everything outside them rather than `aria-modal` on them. Every contained overlay's target is in one
shared set, and an overlay checks it on each drag event rather than at mount, so it lifts by itself when the modal
closes (its overlay unmounts, or its dialog stops matching), with nothing for the page to wire up.

**Drop zones under it.** When a drop zone under the pointer (a `UFileUpload`) has taken the `dragover`, its
`dropEffect` is left alone, and a drop it takes (`defaultPrevented`) isn't emitted again. One it refuses is the
overlay's.

**SSR and cleanup.** Nothing is attached during SSR: the listeners (the drag events on `<html>` or the target, and
`keydown` for Escape on `document`) go on in `onMounted` and come off in `onBeforeUnmount`, and a changed `target`
moves them. The overlay renders only during a drag, so the server never draws it.

**Accessibility.** A polite `role="status"` region, outside the teleport, says the `label` when the overlay appears
and is cleared when it goes, so the next drag is announced again. The overlay is `aria-hidden` and holds nothing
focusable, so focus stays where it was and isn't trapped.

**The rule, on its own.** `fileMatchesAccept(file, accept)`, `sortDroppedFiles(files, { accept, multiple })` and
`dragCarriesFiles(dataTransfer)` are auto-imported (`utils/file-drop.ts`), so a product's own inputs can take the same
files. Tested by `scripts/file-drop.test.mjs`; the component by `apps/base/tests/file-drop.spec.ts`,
`apps/base/tests/file-drop-dialog.spec.ts` (contained in a `ZModal`, the page standing down behind it, with
`ZFileList`) and
`apps/forest/tests/file-drop.spec.ts`.

## In a dialog, with a file list

A transfer dialog's Files field: the whole dialog takes drops, the field lists what the transfer holds and what is being
added, and a `UFileUpload` under the list browses for more (`apps/base/app/pages/file-drop-dialog.vue`).

```vue
<ZModal title="Edit transfer">
  <template #content>
    <div ref="dialog" class="flex flex-col gap-4 p-6">
      <UFormField label="Files">
        <ZFileList :items="[...stored, ...added]" :remove="remove" />
        <UFileUpload :model-value="null" multiple :accept="ACCEPT" :preview="false" @update:model-value="(f) => f && add(f)" />
      </UFormField>
      <ZFileDropOverlay :target="dialog" :accept="ACCEPT" multiple @drop="add" @rejected="report" />
    </div>
  </template>
</ZModal>
```

`add(files)` runs `sortDroppedFiles(files, { accept: ACCEPT, multiple: true })` and appends what it takes; `report`
raises a toast for what it refuses. Browsed files go through `add` too: `UFileUpload`'s own drop check reads only the
MIME types out of `accept` (it drops `.pdf`, `.csv`), and a native file dialog's filter can be switched to all files,
so its model isn't the rule. Binding `:model-value="null"` makes each `update:model-value` carry only the new files. A
drop on the `UFileUpload` itself reaches `add` once: when it takes the drop, the overlay leaves it be.

## ZFileList

| Prop | | |
| --- | --- | --- |
| `items` | `FileListItem[]` | The rows, in order: `File`s and stored files, `{ id, name, size, type? }`. |
| `remove` | `(item, index) => unknown` | Removes a row; a returned promise shows as the row's spinner (`aria-busy`, button disabled) until it settles. Unset, no Remove buttons. |
| `locale` | `string` | The sizes' locale; Nuxt UI's when unset. |
| `remove-label` | `string` | `Remove`; the button's name is it and the file's: "Remove invoice.pdf". |

`@remove-error(error, item)` when `remove`'s promise rejects; the row stays. Why not `UFileUpload`'s own list: its
model is `File[]` (it calls `URL.createObjectURL` on each), so it can't hold a file already on the server, and its
remove is synchronous, by index. The icon is chosen by MIME type or extension (image, video, audio, spreadsheet,
archive, document, or plain). Sizes are `formatFileSize(bytes, locale)`: decimal units, one decimal under 10,
`512 bytes`, `1.2 kB`, `1,2 kB` in German. Rows carry `data-file-row` (the name) and stored ones `data-stored`.
