---
type: feat
"@zooui/nuxt"
---

New `useConfirm()`, `ZConfirmDialog` and `ZConfirmButton`: ask "are you sure?" and await the answer.

- `confirm()` resolves `true` or `false`; `choose()` resolves to the picked action
- Ready-made `confirmDelete()` and `confirmDiscard()`
- Questions can carry `details`, a `color` and icon, and a `size`
- `dismissible: false` keeps Escape and a click outside from cancelling
- `ZConfirmButton` asks in a small popover beside the button and emits `confirm` only on yes
