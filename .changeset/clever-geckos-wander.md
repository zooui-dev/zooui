---
type: feat
"@zooui/nuxt"
---

New ZFilterSelect, a faceted multi-select filter for list and table toolbars. A button names the filter and opens a list of checkbox options, each with an optional count and icon, with a search box and All and Clear buttons. v-model is an array of values, generic over your option type with value-key and label-key (count-key, icon-key and icon-class-key name the other fields). Up to max-shown chosen values (2 unless set) are named on the button as a chip each, then one chip says how many, in your product's own words with selected-label. The search is literal and case-insensitive, so ( or . match themselves, and matches are marked in the label; checking an option clears the search, so the next pick starts from the whole list, and searchable="false" leaves the search box out. Arrow keys move, Space and Enter check, Escape goes back to the button, and each change is announced to screen readers. show-select-all="false" hides the All button; an option's iconClass colors its icon; and ui takes classes for the button, chips, panel, search, list, items and footer, merged over the defaults.
