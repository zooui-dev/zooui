# ZOrderList

```vue
<ZOrderList
  v-model="statuses"
  v-model:selection="selectedId"
  :row-key="(s) => s.id"
  :row-title="(s) => s.name"
  title="Statuses"
  item-label="status"
  allow-remove
  remove-question="Delete this status?"
  @add="addStatus"
  @remove="(s) => (statuses = statuses.filter((x) => x !== s))"
  @reorder="({ item, from, to }) => saveOrder()"
>
  <template #item="{ item, selected }">{{ item.name }}</template>
</ZOrderList>
<StatusForm v-if="selected" v-model="selected" />   <!-- the detail half: the caller's own -->
```

The list half of a master-detail editor: a compact `listbox` with **one** selected row, a
toolbar beside it (Add, Remove, then to top, up, down, to bottom), and the selected item's form in the caller's markup.
Generic over the item type (`T`), so `item` in `#item` is the list's own type.

**The model.** `v-model` is the array. A move hands back a new array holding the same item objects, and `@reorder`
says `{ item, from, to }`. `v-model:selection` is the selected item's key, from `row-key`, a function: it is typed
against `T`, it can build a key from more than one field, and it is the name and shape `ZRepeatingList` uses. One row
is selected at a time; there is no multiple selection. Because the selection is a key, it follows the item through a
move. A key that is not in the list counts as nothing selected.

**Add and remove.** `@add` asks the caller to create the item, put it in the list and select it.
`@remove` hands over the selected item and its index. With a listener bound, the caller takes it out (after a server
call, if it likes); with none, the list takes it out of v-model itself. Either way, once it has gone the
row that took its place is selected, the remove is announced, and focus stays in the list. A remove the caller decides
against (a failed server call) is forgotten at the next selection change, so a later reload that drops the item is
neither announced nor moves the selection. `allow-add` (on by default) and
`allow-remove` (off) show the buttons; `removable` disables Remove for an item that may not go. Remove is a
`ZConfirmButton`, so it asks in a popover first: `remove-question` ("Remove Review?"), `remove-description`,
`remove-confirm-label` (the Remove word) and `remove-cancel-label` ("Cancel") are passed through to it.
`:confirm-remove="false"` makes it a plain button that acts at once. The question is `remove-question`, not
`confirm-label`, because `ZConfirmButton`'s own `confirm-label` names its Yes button.

**The keyboard.** One tab stop with `aria-activedescendant`. Selection follows focus, which is what an editor wants:
Up/Down select the next row and the form follows. With nothing selected, Up and Down both select the first row, and
Enter and Space select nothing (on a selected row they keep it). Home/End select the ends. Typing selects by the row's title, and the same letter
again moves on to the next row starting with it. Alt+Up/Down move the selected row one place, Alt+Home/End to the
ends. Every move is announced in a polite live region ("Moved Review to position 3 of 5."), as is a remove ("Removed
Review. 4 in the list.").

**After a move** the row stays selected and scrolls into view in the list's own scroll box. Focus stays on the list
for a keyboard move, and on the toolbar button for a toolbar move, unless that button is now disabled (Move to top,
at the top), when it goes to the list. Moved rows slide to their new place with `<TransitionGroup>`'s move transition
(180 ms), and jump under `prefers-reduced-motion`.

**The look.** A bordered box on `bg-default` that scrolls past `max-height` (15rem), an optional `title` or `#header`
over it, and `striped` rows. With `fill` it drops `max-height` and takes the height it is given (a grid column, a
panel): the root and the list column stretch, and the box grows to what the header leaves. `ui` takes classes for
`root`, `header`, `list` (the bordered box), `row` and `controls` (the built-in toolbar), merged over the defaults with
tailwind-merge, so `ui.row: 'py-1'` replaces the row's `py-1.5`. The selected row is tinted `bg-primary/10` in `text-highlighted`; with keyboard focus it
also carries an inset primary ring. The toolbar stands to the left of the list from `sm` up, and runs across above it
on a narrow screen. Its buttons are icon-only, named for the selected row: "Move Review up", "Remove Review".

**Words.** `row-title` names a row for the buttons, typeahead and announcements (its text as drawn, without it);
`item-label` names Add ("Add status"); `add-label`, `remove-label`, `move-label`, `controls-label`,
`empty-label` and `announce` replace the rest.

**Slots.** `#item="{ item, index, selected }"`, `#header`, `#empty`, and `#controls` for a toolbar of the caller's own,
given `{ selected, index, add, remove, move, moveTop, moveUp, moveDown, moveBottom, canMove, canRemove }`. Exposed:
`focus()`, `move(move)`, `remove()`. The ordering (`moveTarget`, `moveItem`, `typeaheadIndex`) is framework-free, in
`utils/order-list.ts`.

The list carries `data-testid="order-list"`, each row `data-row` and `data-selected`, the toolbar `data-controls`, its
buttons `data-add`, `data-remove` and `data-move="top|up|down|bottom"`, for e2e selectors.

## ZOrderList or ZRepeatingList

`ZRepeatingList` is for editing rows in place: every row's fields are in the form, and rows are added and removed.
`ZOrderList` is for picking and ordering a list beside an editor: rows are a line each, one is selected, the toolbar
reorders them, and the selected record's form sits next to the list. It is Zoo UI's one reorderable list.
