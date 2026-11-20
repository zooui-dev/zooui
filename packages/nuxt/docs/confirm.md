# useConfirm, ZConfirmDialog and ZConfirmButton

Promise-based confirmation (`composables/useConfirm.ts`, `components/ConfirmDialog.vue`, `components/confirm.ts`,
the queue in `utils/confirm-queue.ts`) and a button that asks in a popover (`components/ConfirmButton.vue`).

```vue
<!-- app.vue: mounted once, inside UApp, beside the page -->
<UApp><NuxtPage /><ZConfirmDialog /></UApp>
```

```ts
const { confirm, choose, confirmDelete, confirmDiscard, dismissAll } = useConfirm()
if (await confirmDelete('the Hartwell invoice')) await remove(invoice)          // true | false
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
| `confirmDelete(what?, overrides?)` | `confirm` with "Delete {what}?", "This can't be undone.", `i-lucide-trash-2`, `color: 'error'`, Delete |
| `confirmDiscard(overrides?)` | `confirm` with "Discard your changes?", `i-lucide-triangle-alert`, `color: 'warning'`, `destructive`, Discard and Keep editing |
| `dismissAll()` | cancels the open question and every one waiting, each with its own dismissed value |

Options (`ConfirmOptions`; `ChooseOptions<V>` has `actions` in place of `confirmLabel`): `title` (names the dialog),
`description` (describes it), `details` (lines listed under it), `icon`, `color` (the edge, the icon's badge and the
confirming button; any `ButtonProps['color']`, so a product's own `ui.colors` too), `destructive` (default
`color === 'error'`), `confirmLabel`, `cancelLabel`. A `ConfirmAction<V>` is `{ label, value, color?, variant?, icon? }`;
its color defaults to the dialog's, else `primary`. The types are exported from `composables/useConfirm.ts`.

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
`role="alertdialog"`, named by the title and described by the description. Props: `cancel-label` and
`confirm-label`, the defaults for questions that don't give their own (Cancel, Confirm). Escape, the close button and a
click outside resolve as a cancel. **Focus** starts on Cancel for a destructive question and on the last (confirming)
action otherwise, so Enter is safe on a delete and quick on everything else. The icon is decoration (`aria-hidden`);
its badge is the color at 10% under the color itself. Hooks for tests: `data-confirm-dialog` on the content,
`data-confirm-cancel`, `data-confirm-action`, `data-confirm-icon`, `data-confirm-details`.

## ZConfirmButton

A `UButton` in a `UPopover`. Every `UButton` prop, attribute and slot passes through (`inheritAttrs: false`, bound to
the button). Props: `question` ("Are you sure?"), `description`, `confirm-label` ("Yes"), `cancel-label` ("No"),
`confirm-color` (`error`), `content` (UPopover's placement, default `{ side: 'bottom', align: 'start' }`) and
`v-model:open`. Emits `confirm` on yes, and `cancel` for every other way it closes: No, Escape, a click outside,
`open` set to false. Focus starts on No and goes back to the button. The popover is a `dialog` named by the button
(reka names a popover after its trigger) and described by the question and its description.

Tested by `scripts/confirm-queue.test.mjs` (the queue), `apps/base/tests/confirm.spec.ts` (every helper for every way
out, focus, the role and name, queuing, the server, the button's events, the product's error color in light and
dark) and `apps/forest/tests/confirm.spec.ts` (the inks on every Forest scheme in light and dark).
