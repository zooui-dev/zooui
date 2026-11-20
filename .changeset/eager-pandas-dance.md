---
type: feat
"@zooui/nuxt"
---

New ZFileDropOverlay: a page takes files dropped anywhere in the window, not only on a drop box like Nuxt UI's UFileUpload. While files are dragged over the window, an overlay on Nuxt UI's tokens says what dropping does (label, description and icon props, or the default slot), announced by a polite live region and taking no focus; it hides when the drag leaves the window or on Escape, and doesn't flicker over the page's children. Only drags carrying files bring it up, never text or links dragged within the page. accept (the native input's MIME types, image/* and .ext) and multiple decide which files @drop gets; the rest come in @rejected with the reason, accept or multiple. With target, it takes drops in one element only, a dialog say, and is drawn inside it, in the dialog's own stacking context. Overlays nest: a page can keep its own while a dialog has another, and only the innermost one under the pointer shows and takes the drop, so there's no disabling the page's by hand. A drop that a drop zone under the overlay takes itself, such as a UFileUpload, isn't emitted again. disabled shows and emits nothing but still keeps a dropped file from opening in the tab.

New ZFileList: the files a form holds, one row each with a file-type icon, the name, the size in the locale's words and a Remove button. It lists Files and files already stored ({ id, name, size, type }) together, for an edit form; remove may return a promise, shown as the row's spinner, and a rejection goes to @remove-error.

fileMatchesAccept, sortDroppedFiles, dragCarriesFiles and formatFileSize are auto-imported, so a dialog's dropped and browsed files can go through one accept rule.