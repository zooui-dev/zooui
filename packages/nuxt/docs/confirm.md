# useConfirm, ZConfirmDialog and ZConfirmButton

Promise-based confirmation (`composables/useConfirm.ts`, `components/ConfirmDialog.vue`, `components/confirm.ts`,
the queue in `utils/confirm-queue.ts`) and a button that asks in a popover (`components/ConfirmButton.vue`).

```vue
<!-- app.vue: mounted once, inside UApp, beside the page -->
<UApp><NuxtPage /><ZConfirmDialog /></UApp>
```

```ts
const { confirm, choose, confirmDelete, confirmDiscard, dismissAll } = useConfirm()
if (await confirmDelete('the Lakeside order')) await remove(order)          // true | false
const yes = await confirm({ title: 'Publish the report?', confirmLabel: 'Publish' }) // true | false
const next = await choose({ title: 'Save before leaving?', actions: [
  { label: 'Discard', value: 'discard', color: 'neutral', variant: 'outline' },
  { label: 'Save', value: 'save' },
] })                                                                               // 'save' | 'discard' | null
```

```vue
<ZConfirmButton label="Remove" icon="i-lucide-trash-2" color="error" variant="ghost" question="Remove this row?" @confirm="remove(row)" />
```

## useConfirm()

| Helper | Resolves to |
| --- | --- |
| `confirm(options: ConfirmOptions)` | `true` when confirmed; `false` for Cancel, Escape, the close button or a click outside |
| `choose<V>(options: ChooseOptions<V>)` | the picked action's `value` (typed `V`); `null` when dismissed |
| `confirmDelete(what?, overrides?)` | `confirm` with "Delete {what}", "Are you sure you want to delete {what}? This action cannot be undone.", `i-lucide-trash-2`, `color: 'error'`, Delete |
| `confirmDiscard(overrides?)` | `confirm` with "Unsaved Changes", "You have unsaved changes. Discard them?", `i-lucide-triangle-alert`, `color: 'warning'`, a red Discard (`confirmColor: 'error'`) and Keep Editing |
| `dismissAll()` | cancels the open question and every one waiting, each with its own dismissed value |

Options (`ConfirmOptions`; `ChooseOptions<V>` has `actions` in place of the three `confirm*` options):

| Option | |
| --- | --- |
| `title` | The question. It names the dialog. |
| `description` | A sentence under the title. It describes the dialog. |
| `details` | Lines listed under the description. A `ConfirmDetail` is a string, or `{ title, text? }`. A string with a `\n` is two-part too: its first line is a heading (`font-medium text-highlighted`) and the rest is the text beneath it (`text-toned`). |
| `icon` | An icon in a 40px badge beside the description, in `color`; with no description, a 32px badge beside the title. Left out, `color: 'error'` brings `i-lucide-circle-alert` and `color: 'warning'` `i-lucide-triangle-alert` (`CONFIRM_COLOR_ICONS`); other colors bring none. `false` shows none. |
| `color` | The edge, the icon's badge, and the confirming button unless `confirmColor` says otherwise. Any `ButtonProps['color']`, so a product's own `ui.colors` too. |
| `confirmColor` | `confirm()` only: the confirming button's color, where it differs from the dialog's. A warning badge with a primary button, or with a red one. Default: `color`, else `primary`. |
| `confirmVariant` | `confirm()` only: the confirming button's variant. Default: `solid`. |
| `destructive` | Focus starts on Cancel. Defaults to `color` or `confirmColor` being `error`. |
| `dismissible` | Default `true`. `false`: Escape and a click outside do nothing; Cancel and the close button still cancel. |
| `size` | The width: `sm` (default, `sm:max-w-md`), `md` (`sm:max-w-xl`) or `lg` (`sm:max-w-3xl`). |
| `confirmLabel`, `cancelLabel` | The buttons' labels. Default: Confirm and Cancel. |

A `ConfirmAction<V>` is `{ label, value, color?, variant?, icon? }`; its color defaults to the dialog's, else `primary`.
The types are exported from `composables/useConfirm.ts`.

- **One at a time; a second call queues.** A call made while a question is open waits until it is answered, then
  opens. Each promise settles exactly once, with its own answer. Replacing the open question instead would answer
  it "cancel" for the person, without them seeing it. The dialog closes, and focus returns, before the next opens.
- **Per request.** The queue belongs to the Nuxt app, kept in a `WeakMap` keyed by it (`components/confirm.ts`), never
  to the module. On the server that is one queue per request, so nothing leaks between visitors. During server
  rendering no one can answer, so every call resolves at once as a cancel.
- **No host, no dialog.** Without a mounted `ZConfirmDialog` a question never shows and its promise never settles;
  in development `useConfirm()` warns.

## ZConfirmDialog

The one place the questions render: a `ZModal` (with the question's `color` as its edge) whose content has
`role="alertdialog"`, named by the title and described by the description. The description
sits in the body with the icon's 40px badge beside it and the details beneath it, indented to its column. A question
with no description (a title only, or a title and details) shows its icon in a 32px badge beside the title instead,
and any details stay in the body, indented to the title text. `icon: false` shows none anywhere. Props: `cancel-label` and
`confirm-label`, the defaults for questions that don't give their own (Cancel, Confirm). Escape, the close button and a
click outside resolve as a cancel, unless the question is `dismissible: false`. The footer has Cancel on the left and
the answers together on the right. **Focus** starts on Cancel for a destructive question and on the last
(confirming) action otherwise, so Enter is safe on a delete and quick on everything else. The icon is decoration
(`aria-hidden`); its badge is the color at 10% under the color itself. Hooks for tests: `data-confirm-dialog` on the
content, `data-confirm-cancel`, `data-confirm-actions`, `data-confirm-action`, `data-confirm-icon` (its value is the
icon's name), `data-confirm-description`, `data-confirm-details`, `data-confirm-detail-title`, `data-confirm-detail-text`.

## ZConfirmButton

A `UButton` in a `UPopover`. Every `UButton` prop, attribute and slot passes through (`inheritAttrs: false`, bound to
the button).

| Prop | Default | |
| --- | --- | --- |
| `question` | "Are you sure?" | The question. |
| `description` | | A line under it. |
| `confirm-label` | "Yes" | The confirming button. |
| `cancel-label` | "No" | The declining button. |
| `confirm-color` | `error` | The confirming button's color. |
| `confirm-variant` | `outline` | The confirming button's variant. |
| `question-icon` | `i-lucide-circle-alert` | An icon before the question; `false` for none. |
| `confirm-enabled` | `true` | `false`: no popover; the plain `UButton`, whose click emits `confirm` at once. |
| `content` | `{ side: 'bottom', align: 'start' }` | UPopover's placement. |
| `arrow` | `{ width: 16, height: 8 }` | UPopover's arrow; `false` for none. |
| `v-model:open` | `false` | Whether the question is showing. |

Emits `confirm` on yes, and `cancel` for every other way it closes: No, Escape, a click outside, `open` set to
false. Focus starts on No and goes back to the button. The popover is a `dialog` named by the button (reka names a
popover after its trigger) and described by the question and its description; the question icon is `aria-hidden`.
Hooks: `data-confirm-popover`, `data-confirm-question`, `data-confirm-description`, `data-confirm-question-icon` (its value is the icon's name),
`data-confirm-cancel`, `data-confirm-action`.

Tested by `scripts/confirm-queue.test.mjs` (the queue), `apps/base/tests/confirm.spec.ts` (every helper for every way
out, focus, the role and name, queuing, the server, the button's events, `confirmColor`, the icon from the color,
the icon beside the title when there is no description, two-part details, `dismissible`, `size`, the footer,
`confirm-enabled`, `confirm-variant`, `question-icon` and `arrow`, the product's error color in light and dark)
and `apps/forest/tests/confirm.spec.ts` (the inks on every Forest scheme in light and dark, details, the popover's
icon and the title-row icon included, and `confirmColor` on the theme).
