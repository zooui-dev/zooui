---
type: feat
"@zooui/nuxt"
---

New `ZFileDropOverlay`: drop files anywhere on the page, or in one dialog, and an overlay says what the drop will do.

- Choose which files it takes with `accept`, `multiple` and your own `filter`
- Refused files come in `@rejected`, with the reason
- `target` limits it to one dialog or region; an open dialog's overlay takes over from the page's
- `label`, `description` and `icon` set the message

New `ZFileList`: the files a form holds, one row each with an icon, the name, the size and Remove.

- Lists new files and already-uploaded ones together
- `remove` can return a promise, shown as a spinner on the row
- `preview` shows image thumbnails
- `#leading` and `#trailing` slots for a checkbox or badge on each row
