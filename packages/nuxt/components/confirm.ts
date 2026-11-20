/**
 * What useConfirm() (composables/useConfirm.ts) and <ZConfirmDialog> share: the request types, the presets, and the
 * queue each Nuxt app keeps. Here rather than in composables/ so the icons the presets name are checked against
 * Z_ICONS (scripts/check-icons.test.mjs) with the rest of the components' icons.
 *
 * ONE QUEUE PER NUXT APP, never one per module. A module-level queue would be shared by every request a server
 * renders, so a dialog asked for while rendering one person's page could open in another's. The queue is kept in a
 * WeakMap keyed by the app, which Nuxt creates once in the browser and once per request on the server, and goes
 * with it.
 */
import type { ButtonProps } from '@nuxt/ui'
import { shallowRef, type ShallowRef } from 'vue'
import { createConfirmQueue, type ConfirmQueue, type ConfirmQueueEntry } from '../utils/confirm-queue'

/** A color Nuxt UI's buttons take: its seven, and any the product adds in `ui.colors`. (Nuxt UI types it as a key,
 *  which takes in `number | symbol`; a color is only ever a name.) */
export type ConfirmColor = Extract<NonNullable<ButtonProps['color']>, string>
export type ConfirmVariant = NonNullable<ButtonProps['variant']>

/** What every dialog says. */
export interface ConfirmBaseOptions {
  /** The question, as the dialog's title: "Delete the Hartwell invoice?" */
  title: string
  /** A sentence under the title saying what happens. */
  description?: string
  /** Lines listed under the description: the records affected, say. */
  details?: string[]
  /** An icon beside the title, in `color`. `confirmDelete` and `confirmDiscard` set their own. */
  icon?: string
  /** The dialog's color: its edge, its icon and its confirming button. `error` makes it destructive. */
  color?: ConfirmColor
  /** Destructive: focus starts on Cancel, so Enter can't do the harm. Defaults to `color === 'error'`. */
  destructive?: boolean
  /** The dismissing button's label. Default: "Cancel". */
  cancelLabel?: string
}

/** A yes-or-no question. */
export interface ConfirmOptions extends ConfirmBaseOptions {
  /** The confirming button's label. Default: "Confirm". */
  confirmLabel?: string
}

/** One of several answers `choose()` offers. */
export interface ConfirmAction<V> {
  label: string
  /** What `choose()` resolves to when this action is picked. */
  value: V
  /** Default: the dialog's color, else `primary`. */
  color?: ConfirmColor
  /** Default: `solid`. */
  variant?: ConfirmVariant
  icon?: string
}

/** A question with several answers: Save, Discard, Cancel. */
export interface ChooseOptions<V> extends ConfirmBaseOptions {
  actions: ConfirmAction<V>[]
}

/** What the queue holds: either kind of request, answered with `true`/`false` or an action's value/`null`. */
export type ConfirmRequest =
  | { kind: 'confirm', options: ConfirmOptions }
  | { kind: 'choose', options: ChooseOptions<unknown> }

export type ConfirmEntry = ConfirmQueueEntry<ConfirmRequest, unknown>

export const CONFIRM_DELETE_ICON = 'i-lucide-trash-2'
export const CONFIRM_WARNING_ICON = 'i-lucide-triangle-alert'

/** `confirmDelete('the Hartwell invoice')`: an error-colored, destructive question with Delete and Cancel. */
export function deleteOptions(what?: string, overrides?: Partial<ConfirmOptions>): ConfirmOptions {
  return {
    title: what ? `Delete ${what}?` : 'Delete this?',
    description: 'This can’t be undone.',
    icon: CONFIRM_DELETE_ICON,
    color: 'error',
    confirmLabel: 'Delete',
    ...overrides,
  }
}

/** `confirmDiscard()`: unsaved changes, with Discard and Keep editing. Destructive: focus starts on Keep editing. */
export function discardOptions(overrides?: Partial<ConfirmOptions>): ConfirmOptions {
  return {
    title: 'Discard your changes?',
    description: 'You have changes that haven’t been saved.',
    icon: CONFIRM_WARNING_ICON,
    color: 'warning',
    destructive: true,
    confirmLabel: 'Discard',
    cancelLabel: 'Keep editing',
    ...overrides,
  }
}

/** Whether a request is destructive: its own say, else whether it is error-colored. */
export const isDestructive = (options: ConfirmBaseOptions) => options.destructive ?? options.color === 'error'

/** A Nuxt app's queue, with its head as a Vue ref for the host to render, and how many hosts are mounted. */
export interface ConfirmController {
  queue: ConfirmQueue<ConfirmRequest, unknown>
  current: ShallowRef<ConfirmEntry | undefined>
  hosts: number
}

const controllers = new WeakMap<object, ConfirmController>()

/** The queue of the Nuxt app given (one per request on the server), made the first time it is asked for. */
export function confirmController(app: object): ConfirmController {
  let controller = controllers.get(app)
  if (!controller) {
    const queue = createConfirmQueue<ConfirmRequest, unknown>()
    const current = shallowRef(queue.current)
    queue.subscribe(() => { current.value = queue.current })
    controller = { queue, current, hosts: 0 }
    controllers.set(app, controller)
  }
  return controller
}
