---
type: feat
"@zooui/nuxt"
---

ZRepeatingList can reorder its rows. With the new reorderable prop each row gets Move up and Move down buttons (move-to-ends adds Move to top and Move to bottom), disabled at the edge they move toward and named for what moves where ("Move Part 3 up"). From anything focused in a row, Alt+ArrowUp and Alt+ArrowDown move it one place, and Alt+Home and Alt+End (or Alt+Shift+ArrowUp and Alt+Shift+ArrowDown) move it to the top or bottom. Focus stays with the moved row, and each move is announced in the list's polite live region ("Moved Part 3 to position 1 of 5."); the words are the move-label and announce-move props. v-model gets a new array of the same row objects, so row keys, per-row errors and folded rows go with their row, and it works with min, max and compact. It is off by default, so existing lists are unchanged. There is no drag and drop.