---
type: feat
"@zooui/nuxt"
---

ZSelectMenu's typeahead searches from the top of the list, whatever is selected, and pressing one letter again and again cycles through the items that start with it. A typeahead pick now tells a surrounding UForm, so validate-on-change and dirty tracking see it, and v-model's modifiers apply to it. The trigger shows its focus ring on any focus, a click's included, not only on keyboard focus, drawn with Nuxt UI's own focus style, so a focused menu looks exactly like a focused UInput: the 1px ring and the soft outer halo, in the menu's color.