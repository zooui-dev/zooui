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

Every `UButton` prop, attribute and slot passes straight through to the button: `label`, `icon`, `color`, `variant`, `size`, `loading`, `disabled` and the rest. The question has props of its own:

| Prop | Default | |
| --- | --- | --- |
| `question` | "Are you sure?" | The question. |
| `description` | | A line under it. |
| `confirm-label`, `cancel-label` | "Yes", "No" | The buttons' labels. |
| `confirm-color` | `error` | The confirming button's color. |
| `confirm-variant` | `outline` | The confirming button's variant. |
| `question-icon` | `i-lucide-circle-alert` | An icon before the question. `false` shows none. |
| `confirm-enabled` | `true` | `false` skips the question: the button emits `confirm` on click. |
| `content` | `{ side: 'bottom', align: 'start' }` | Where the popover opens, as on `UPopover`. |
| `arrow` | `{ width: 16, height: 8 }` | The popover's arrow. `false` shows none. |

`confirm-enabled` is for an action that only sometimes needs asking: removing a row with nothing in it, say.

```vue
<ZConfirmButton label="Remove" :confirm-enabled="row.amount !== 0" question="Remove this row?" @confirm="remove(row)" />
```

When the question opens, focus starts on the declining button, so pressing Enter doesn't confirm by accident. When it closes, focus goes back to the button. The popover is a `dialog` named by the button and described by the question.

For a question that needs more than a line, use `useConfirm()` and the [confirm dialog](/components/confirm-dialog).

## Coming from Buoy

`UConfirmButton`'s props were renamed. Mind `confirmLabel`: in Buoy it was the question, and here `confirm-label` is the Yes button.

| Buoy `UConfirmButton` | `ZConfirmButton` |
| --- | --- |
| `confirmLabel` | `question` |
| `confirmSublabel` | `description` |
| `confirmYes` | `confirm-label` |
| `confirmNo` | `cancel-label` |
| `confirmIcon` | `question-icon` |
| `confirmEnabled` | `confirm-enabled` |
| `align` | `content.align`, as in `:content="{ side: 'bottom', align: 'end' }"` |
| `@decline` | `@cancel`, which also fires on Escape and a click outside |

The look is Buoy's by default: an outlined red Yes, the alert icon and the arrow.
