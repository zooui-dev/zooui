# Changelog

## 0.3.1

No changes in this release.

## 0.3.0

### 🚀 Enhancements

- [#28](https://github.com/zooui-dev/zooui/pull/28) [`8e83e66`](https://github.com/zooui-dev/zooui/commit/8e83e6635f418adba7060a264fa89fc461d61fac) - New `ZOrderList`: a reorderable list with one selected row, for master-detail editors.
  
  - `v-model:selection` holds the selected row, which the form beside the list edits
  - A toolbar adds, removes and moves the selected row (`@add`, `@remove`, `@reorder`)
  - `allow-remove` turns on Remove, which asks first
  - Alt+arrow keys move a row from the keyboard
  - `fill` stretches the list to the height it is given
- [#24](https://github.com/zooui-dev/zooui/pull/24) [`3c7a757`](https://github.com/zooui-dev/zooui/commit/3c7a7571de0001f073279d3314f549ca74e6b377) - New `ZFilterSelect`: a multi-select filter button for list and table toolbars.
  
  - Opens a searchable list of checkbox options, with All and Clear
  - Options can show a count and an icon
  - The button names what is chosen, up to `max-shown`, then a count
  - `selected-label` puts that count in your own words
  - Works from the keyboard and is announced to screen readers
- [#14](https://github.com/zooui-dev/zooui/pull/14) [`ebcbe92`](https://github.com/zooui-dev/zooui/commit/ebcbe921af04ec86eed67a2eca1eba3b04a20d5d) - New `ZFileDropOverlay`: drop files anywhere on the page, or in one dialog, and an overlay says what the drop will do.
  
  - Choose which files it takes with `accept`, `multiple` and your own `filter`
  - Refused files come in `@rejected`, with the reason
  - `target` limits it to one dialog or region; an open dialog's overlay takes over from the page's
  - `label`, `description` and `icon` set the message
  
  New `ZFileList`: the files a form holds, one row each with an icon, the name, the size and Remove.
  
  - Lists new files and already-uploaded ones together
  - `remove` can return a promise, shown as a spinner on the row
  - `preview` shows image thumbnails
  - `#leading` and `#trailing` slots for a checkbox or badge on each row
- [#16](https://github.com/zooui-dev/zooui/pull/16) [`08546d2`](https://github.com/zooui-dev/zooui/commit/08546d2358d580754fea60bc43404b74458f68d2) - New `ZSelectMenu`: Nuxt UI's `USelectMenu` with a keyboard built for fast data entry. Every `USelectMenu` prop, slot and event still works.
  
  - Type on the closed menu to pick an item (`typeahead`)
  - Tab takes the highlighted item and moves to the next field (`close-on-tab`)
  - `open-on-focus` opens the menu when you Tab into it
  - Shows its focus ring after a click too, like a text input
- [#13](https://github.com/zooui-dev/zooui/pull/13) [`b73a5e1`](https://github.com/zooui-dev/zooui/commit/b73a5e10cd89830ae49a84e06057e5ddd0a5830e) - New `useConfirm()`, `ZConfirmDialog` and `ZConfirmButton`: ask "are you sure?" and await the answer.
  
  - `confirm()` resolves `true` or `false`; `choose()` resolves to the picked action
  - Ready-made `confirmDelete()` and `confirmDiscard()`
  - Questions can carry `details`, a `color` and icon, and a `size`
  - `dismissible: false` keeps Escape and a click outside from cancelling
  - `ZConfirmButton` asks in a small popover beside the button and emits `confirm` only on yes
- [#11](https://github.com/zooui-dev/zooui/pull/11) [`579a4d2`](https://github.com/zooui-dev/zooui/commit/579a4d2529a11b94421abc9a5ab0d8c6202b35f4) - `ZRepeatingList` rows opened for editing now have Done, which keeps the edits, and Cancel, which puts the row back as it was. Escape cancels too; `done-label` and `cancel-label` set the words.
- [#27](https://github.com/zooui-dev/zooui/pull/27) [`317ed10`](https://github.com/zooui-dev/zooui/commit/317ed109292bce12bdddfadf5ca72f7200290192) - `ZDateField` reads eight digits as a whole date (`05122026`), steps its shortcut keys from the saved date rather than half-typed text, and has a `#leading` slot in place of the icon.
- [#15](https://github.com/zooui-dev/zooui/pull/15) [`e55fec3`](https://github.com/zooui-dev/zooui/commit/e55fec384fc07ca0ae95eac491b22af3c64c2259) - New `ZOptionalDate`: a checkbox in front of a date field, for a day a record may or may not have, such as "Has an end date".
  
  - `v-model:enabled` binds the checkbox
  - Unticking greys out the date and keeps it; `clear-when-off` sets it to `null` instead
  - `@enabled-change` fires when the user ticks or unticks the box
  - Ticking the box moves focus into the date

## 0.2.0

### 🚀 Enhancements

- [#6](https://github.com/zooui-dev/zooui/pull/6) [`88234ce`](https://github.com/zooui-dev/zooui/commit/88234ced718a983cc1f02628562ef26951b6bc10) - ZDateField takes an @internationalized/date CalendarDate as well as a Temporal.PlainDate, and hands back whichever its v-model holds, so it works with code written for Nuxt UI's UInputDate and UCalendar; model-type="calendar-date" chooses CalendarDates for a model that starts out null. It also takes Nuxt UI's min-value, max-value and is-date-unavailable: the calendar disables those days; a typed date outside them keeps the date the field had and marks the field invalid (aria-invalid, an @invalid event with a message to show); and the shortcut keys stop at the limits and skip unavailable days. Only a Gregorian CalendarDate is accepted. It is not a replacement for UInputDate: there is no range, no time and no segmented input. The parser at @zooui/nuxt/date-entry gains toPlainDate, fromPlainDate, checkDateLimits, dateLimitMessage and isDateShortcut, and applyDateShortcut takes the limits as an optional last argument.

## 0.1.1

### 📖 Documentation

- [#2](https://github.com/zooui-dev/zooui/pull/2) [`d278b48`](https://github.com/zooui-dev/zooui/commit/d278b481b0929fda838edee74af6b4d7291c7352) Thanks [@JohnCampionJr](https://github.com/JohnCampionJr)! - The README is cut down to install, use, versions and the component list; the full reference moves to docs/ in the repository.

## 0.1.0

### Minor Changes

- Initial release
