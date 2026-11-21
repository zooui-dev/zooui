---
type: feat
"@zooui/nuxt"
---

Add ZSearchInput, a search box for list and table toolbars that hands back what is typed once typing pauses.

- `v-model` and the `filter` event follow the typing after a pause, 300 ms by default (`debounce`)
- A clear button and Escape empty the field at once, keeping focus in it
- `placeholder`, `icon`, `clear-icon` and `clear-label`; `size`, `disabled` and `ui` work as on `UInput`
- Exposes `focus()` for a keyboard shortcut