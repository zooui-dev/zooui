---
type: feat
"@zooui/nuxt"
---

New: ZFilterSelect, a faceted multi-select filter for list and table toolbars. A button names the filter and shows the chosen value (or how many) in a badge; it opens a searchable list of checkbox options, each with an optional count and icon, with All and Clear. v-model is an array of values, generic over your option type with value-key and label-key. The search is literal and case-insensitive, so ( or . match themselves, and matches are marked in the label. Arrow keys, Space and Enter to check, Escape back to the button, and each change announced to screen readers. Up to max-shown values (2 unless set) are named on the button as a chip each, then one chip says how many, in your product's own words with selected-label; show-select-all hides the All button; an option's iconClass colors its icon; and ui takes classes for the button, chips, panel, search, list, items and footer, merged over the defaults. Checking an option clears the search, so the next pick starts from the whole list.
