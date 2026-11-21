---
type: feat
"@zooui/nuxt"
---

ZStatus takes a product's own statuses, so you define them once and every status badge and status select shows the same label, icon and color.

- Set them in app.config under `zooui.status.states` (key → `label`, `icon`, `color`), or for one use with the new `states` prop.
- The five built-in states stay, and your map adds to or overrides them.
- A key the map doesn't know shows "Unknown" with a help icon; change it with `zooui.status.fallback`.
- `state` autocompletes your own keys.
- `useStatusStates()` gives the same map as items for a select or filter.