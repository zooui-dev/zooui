---
type: feat
"@zooui/nuxt"
---

New `ZOrderList`: a reorderable list with one selected row, for master-detail editors.

- `v-model:selection` holds the selected row, which the form beside the list edits
- A toolbar adds, removes and moves the selected row (`@add`, `@remove`, `@reorder`)
- `allow-remove` turns on Remove, which asks first
- Alt+arrow keys move a row from the keyboard
- `fill` stretches the list to the height it is given
