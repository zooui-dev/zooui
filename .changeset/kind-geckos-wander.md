---
type: feat
"@zooui/nuxt"
---

ZRepeatingList rows open for editing can now be closed again. With a #summary slot, an open row has Done, which folds it back to its summary keeping the edits, and Cancel, which puts back what the row held when it opened (nested fields included, written back into the same object so the row keeps its identity and key) and folds it. Escape in the row is Cancel, unless a field inside handles Escape itself, such as an open menu or date popover. Cancel on a row added in the list and not yet Done removes it, except at min, where it has no Cancel. Done on a row with an error keeps it open with the error showing and focus in its first field; so does Cancel, after putting the row's values back. After Done or Cancel, focus goes to the row's Edit button. The words are the done-label and cancel-label props.
