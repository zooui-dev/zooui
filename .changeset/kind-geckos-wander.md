---
type: feat
"@zooui/nuxt"
---

ZRepeatingList rows open for editing can now be closed again. With a #summary slot, an open row has Done, which folds it back to its summary keeping the edits, and Cancel, which puts back what the row held when it opened (nested fields included, written back into the same object so the row keeps its identity and key) and folds it. Escape in the row is Cancel, unless a field inside handles Escape itself, such as an open menu or date popover. Cancel on a row added in the list and not yet Done removes it, except at min. Done on a row with an error keeps it open with the error showing. Focus goes to the row's Edit button afterward, and the words are the done-label and cancel-label props. In a reorderable list, the rows now slide to their new places when one moves, and move at once under prefers-reduced-motion.