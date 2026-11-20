---
title: Confirm dialog
description: Ask a question and await the answer. useConfirm() returns promise-based helpers, and ZConfirmDialog is where they render.
component: ZConfirmDialog
preview: ConfirmDialogDelete
---

Asking "are you sure?" usually means a modal, an `open` ref, and the action split across two handlers. `useConfirm()` makes it one line: ask, await the answer, carry on.

```ts
const { confirm, choose, confirmDelete, confirmDiscard } = useConfirm()

if (await confirmDelete('the Hartwell invoice')) await remove(invoice)
```

## Mount the dialog once

The questions all render in one `ZConfirmDialog`. Put it inside `<UApp>`, beside the page, in `app.vue`:

```vue
<template>
  <UApp>
    <NuxtPage />
    <ZConfirmDialog />
  </UApp>
</template>
```

With none mounted, a question is never shown and its promise never settles. In development, `useConfirm()` warns when that happens.

## Confirm

`confirm(options)` resolves to `true` when confirmed, and `false` when cancelled. Escape, the close button and a click outside all count as a cancel. The presets set the words, the icon and the color for you:

- **`confirmDelete(what?, overrides?)`** asks "Delete {what}", in the error color, with Delete and Cancel.
- **`confirmDiscard(overrides?)`** asks about "Unsaved Changes", in the warning color, with a red Discard and Keep Editing.

::component-example{name="ConfirmDialogDelete"}
::

| Option | |
| --- | --- |
| `title` | The question. It names the dialog. |
| `description` | A sentence under the title. It describes the dialog. |
| `details` | Lines listed under the description, such as the records affected. A line with a `\n` in it, or a `{ title, text }`, shows a heading over its text. |
| `icon` | An icon beside the title, in `color`. Left out, `error` shows a circle-alert and `warning` a triangle. `false` shows none. |
| `color` | The dialog's edge, its icon and its confirming button. Any color Nuxt UI's buttons take. |
| `confirmColor` | The confirming button's color, where it differs: a warning dialog with a primary button, or with a red one. |
| `confirmVariant` | The confirming button's variant. Default: `solid`. |
| `destructive` | Focus starts on Cancel. Defaults to `color` or `confirmColor` being `error`. |
| `dismissible` | `false` keeps the dialog open on Escape and a click outside. Cancel and the close button still cancel it. |
| `size` | `sm` (the default), `md` or `lg`. |
| `confirmLabel`, `cancelLabel` | The buttons' labels. Default: Confirm and Cancel. |

```ts
await confirm({
  title: 'Import with mismatches?',
  color: 'warning',          // the badge and the edge
  confirmColor: 'primary',   // the Import button
  confirmLabel: 'Import',
  details: [
    'Report Basis Mismatch\nThis file is on the cash basis; the client reports on accrual.',
    { title: 'Missing accounts', text: '3 accounts aren’t in the chart of accounts.' },
  ],
})
```

## Choose

`choose(options)` offers several answers and resolves to the picked action's `value`, or `null` when dismissed. The type of `value` is yours, so the result is typed. Each action takes a `label`, a `value`, and optionally a `color`, `variant` and `icon`. Cancel is always there.

::component-example{name="ConfirmDialogChoose"}
::

## Focus and screen readers

The dialog is an `alertdialog`, named by its title and described by its description.

- **A destructive question** (`destructive`, or `color: 'error'`) opens with focus on Cancel, so pressing Enter can't do the harm.
- **Any other question** opens on its last action, the confirming one.

When the dialog closes, focus goes back to where it was.

In the footer, Cancel sits on the left and the answers together on the right.

## One at a time

A question asked while another is open waits in line. It opens once the first is answered, and each promise settles with its own answer. Queuing is deliberate: replacing the open question would answer it "cancel" for the person, without them ever seeing it. `dismissAll()` cancels the open question and every one waiting, for example on sign-out.

## On the server

Each Nuxt app keeps its own queue, which on the server means one per request, so a question never crosses from one visitor's page to another's. During server rendering no one can answer, so every call resolves at once as a cancel (`false` or `null`).

## Coming from Buoy

`useBuoyConfirm()` and `BConfirmDialog` map onto `useConfirm()` and `ZConfirmDialog` almost name for name:

| Buoy | Zoo UI |
| --- | --- |
| `message` | `description` |
| `iconColor` | `color`, which also colors the edge, and the confirming button unless `confirmColor` is given |
| `confirmColor`, `confirmVariant`, `icon`, `dismissible`, `size` | the same names |
| `details` with `\n` | works as before |
| action `key` | action `value`, of any type, so `choose()` is typed |
| `confirmDelete`, `confirmDiscard` | the same names, words and colors |

`UConfirmButton` is now the [confirm button](/components/confirm-button), and its props were renamed: see the table there.
