# ZFileDropOverlay

Files dropped anywhere in the window (`components/FileDropOverlay.vue`), with its sorting rule in
`utils/file-drop.ts`. Nuxt UI's `UFileUpload` takes a drop on its box; this takes one on the page. While files are
dragged over the window a full-window overlay says what dropping does, and the drop hands the files back.

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
| `target` | `HTMLElement \| { $el } \| string \| null` | Take drops in this element only, with the overlay placed over it: an element or template ref, a component, or a selector. `null` takes nothing (a ref not set yet); unset is the window. |

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
(the drag left the window), ends the drag. The overlay stays mounted for the whole drag: dismissed (Escape) or
disabled, it is transparent and `pointer-events: none` rather than removed, because an element removed from under the
pointer never gets its `dragleave`, and the count would stick above zero. Only a drop on the overlay itself emits, so
a drop zone drawn over it (a modal's `UFileUpload`) keeps its own drop; set `disabled` while one is open, since the
overlay is otherwise on top.

**Scoped.** With `target`, the listeners go on that element instead of `<html>`, and the overlay (in `<body>`, out of
the target) counts its own enter and leave, so moving onto it doesn't end the drag. Its box is measured from the
target as the drag enters and on each `dragover`, so it follows a scroll. A drop outside the target is the page's
business, as it is without the component.

**SSR and cleanup.** Nothing is attached during SSR: the listeners (the drag events on `<html>` or the target, and
`keydown` for Escape on `document`) go on in `onMounted` and come off in `onBeforeUnmount`, and a changed `target`
moves them. The overlay renders only during a drag, so the server never draws it.

**Accessibility.** A polite `role="status"` region, outside the teleport, says the `label` when the overlay appears
and is cleared when it goes, so the next drag is announced again. The overlay is `aria-hidden` and holds nothing
focusable, so focus stays where it was and isn't trapped.

**The rule, on its own.** `fileMatchesAccept(file, accept)`, `sortDroppedFiles(files, { accept, multiple })` and
`dragCarriesFiles(dataTransfer)` are auto-imported (`utils/file-drop.ts`), so a product's own inputs can take the same
files. Tested by `scripts/file-drop.test.mjs`; the component by `apps/base/tests/file-drop.spec.ts` and
`apps/forest/tests/file-drop.spec.ts`.
