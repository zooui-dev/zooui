---
title: File drop overlay
description: Take files dropped anywhere in the window, or in one region, with an overlay that says what dropping does.
component: ZFileDropOverlay
---

`ZFileDropOverlay` lets a page take files dropped anywhere on it, not only on a drop box. While files are dragged over the window, an overlay covers it and says what dropping does. The drop hands back the files: the ones `accept` takes in `@drop`, the rest in `@rejected`. Nuxt UI's `UFileUpload` is the drop box; this is the whole page. Put one in the page, or the layout, that should take the files.

```vue
<ZFileDropOverlay accept="image/*,.pdf" multiple label="Drop receipts to attach them" @drop="attach" @rejected="warn" />
```

## In a region

`target` takes drops in one element instead of the window: an element, a template ref to one, a component, or a selector. The overlay then covers that element only. Drag a file from your desktop onto the box below.

::component-example{name="FileDropOverlayRegion"}
::

## What it takes

- **`accept`** is the native input's: MIME types (`application/pdf`), a family (`image/*`) and extensions (`.csv`), comma-separated or as a list. Without it, every file is taken.
- **`multiple`** takes every matching file. Without it, the first is taken and the others are refused.
- **`@rejected`** gets each refused file with its reason: `accept` (its type isn't taken) or `multiple` (it came after the first). Nothing is dropped silently. `@drop` and `@rejected` fire only when they have files.

`sortDroppedFiles(files, { accept, multiple })` and `fileMatchesAccept(file, accept)` are auto-imported, so your own inputs can follow the same rule.

## When it shows

- **Only for files.** Text, links and elements dragged within the page don't bring it up.
- **No flicker.** The drag is counted across every element it crosses, so the overlay doesn't blink as it passes over the page's children.
- **Hiding.** It goes when the drag leaves the window (or the region) or the files are dropped. Escape hides it for the rest of that drag.
- **`disabled`** shows nothing and emits nothing, for when another drop zone (a modal's `UFileUpload`, say) should get the files. A file dropped on the page is still kept from opening in the tab.

The overlay is drawn over everything, on Nuxt UI's `bg-default` and `bg-elevated`, in the product's colors in light and dark. Change its words with `label` and `description`, its icon with `icon` (`false` for none), or replace the message with the default slot. Attributes such as `class` go on the overlay.

## Accessibility

A polite live region announces the `label` as the overlay appears. The overlay is hidden from assistive tech and holds nothing focusable, so focus stays where it was and isn't trapped.
