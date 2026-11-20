---
type: feat
"@zooui/nuxt"
---

New ZFileDropOverlay: a page takes files dropped anywhere in the window, not only on a drop box like Nuxt UI's UFileUpload. While files are dragged over the window, an overlay on Nuxt UI's tokens says what dropping does (label, description and icon props, or the default slot), announced by a polite live region and taking no focus; it hides when the drag leaves the window or on Escape, and doesn't flicker over the page's children. Only drags carrying files bring it up, never text or links dragged within the page. accept (the native input's MIME types, image/* and .ext) and multiple decide which files @drop gets; the rest come in @rejected with the reason, accept or multiple. disabled shows and emits nothing but still keeps a dropped file from opening in the tab, and target scopes it to one element. The same rule is auto-imported as fileMatchesAccept, sortDroppedFiles and dragCarriesFiles.