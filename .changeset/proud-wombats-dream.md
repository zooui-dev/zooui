---
type: feat
"@zooui/nuxt"
---

New `ZOptionalDate`: a checkbox in front of a date field, for a day a record may or may not have, such as "Has an end date".

- `v-model:enabled` binds the checkbox
- Unticking greys out the date and keeps it; `clear-when-off` sets it to `null` instead
- `@enabled-change` fires when the user ticks or unticks the box
- Ticking the box moves focus into the date
