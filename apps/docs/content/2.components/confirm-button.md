---
title: Confirm button
description: A button that asks "Are you sure?" in a popover beside it, and emits confirm only when the answer is yes.
component: ZConfirmButton
wraps: UButton
preview: ConfirmButtonBasic
---

Some actions only need a quick check before they run: removing a row, revoking a token. A full dialog would be too much. `ZConfirmButton` is a `UButton` that asks in a `UPopover` beside it. It emits `confirm` only when the answer is yes. No, Escape and a click outside close the question and emit `cancel`.

::component-example{name="ConfirmButtonBasic"}
::

Every `UButton` prop, attribute and slot passes straight through to the button: `label`, `icon`, `color`, `variant`, `size`, `loading`, `disabled` and the rest. The question's own words are props: `question`, `description`, `confirm-label`, `cancel-label`, and `confirm-color` for the confirming button. `content` places the popover, as on `UPopover`.

When the question opens, focus starts on the declining button, so pressing Enter doesn't confirm by accident. When it closes, focus goes back to the button. The popover is a `dialog` named by the button and described by the question.

For a question that needs more than a line, use `useConfirm()` and the [confirm dialog](/components/confirm-dialog).
