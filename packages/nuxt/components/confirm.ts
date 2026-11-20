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
  /** The question, as the dialog's title: "Publish the report?" */
  title: string
  /** A sentence under the title saying what happens. */
  description?: string
  /** Lines listed under the description: the records affected, say. A line with a `\n` in it, or a `{ title, text }`,
   *  is two-part: a heading, and the text beneath it. */
  details?: ConfirmDetail[]
  /** An icon beside the description, in `color`. Left out, `error` and `warning` bring their own (CONFIRM_COLOR_ICONS);
   *  `false` shows none. `confirmDelete` and `confirmDiscard` set their own. */
  icon?: string | false
  /** The dialog's color: its edge, its icon and, unless `confirmColor` says otherwise, its confirming button.
   *  `error` makes it destructive. */
  color?: ConfirmColor
  /** Destructive: focus starts on Cancel, so Enter can't do the harm. Defaults to `color` or `confirmColor` being
   *  `error`. */
  destructive?: boolean
  /** The dismissing button's label. Default: "Cancel". */
  cancelLabel?: string
  /** Whether Escape and a click outside cancel. Default: true. When false, only Cancel and the close button do. */
  dismissible?: boolean
  /** The dialog's width: `sm` (the default), `md` or `lg`. */
  size?: ConfirmSize
}

export type ConfirmSize = 'sm' | 'md' | 'lg'

/** One line of `details`: a string (a `\n` splits it into heading and text), or the two parts given apart. */
export type ConfirmDetail = string | { title: string, text?: string }

/** A yes-or-no question. */
export interface ConfirmOptions extends ConfirmBaseOptions {
  /** The confirming button's label. Default: "Confirm". */
  confirmLabel?: string
  /** The confirming button's color, where it differs from the dialog's: a warning dialog with a primary button.
   *  Default: `color`, else `primary`. `error` makes the question destructive. */
  confirmColor?: ConfirmColor
  /** The confirming button's variant. Default: `solid`. */
  confirmVariant?: ConfirmVariant
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
export const CONFIRM_ERROR_ICON = 'i-lucide-circle-alert'

/** The icon a question gets from its color when it names none. */
export const CONFIRM_COLOR_ICONS: Partial<Record<ConfirmColor, string>> = {
  error: CONFIRM_ERROR_ICON,
  warning: CONFIRM_WARNING_ICON,
}

/** The icon shown beside the description: the question's own, else its color's, and none for `icon: false`. */
export function confirmIcon(options: ConfirmBaseOptions): string | undefined {
  if (options.icon === false) return undefined
  return options.icon || (options.color && CONFIRM_COLOR_ICONS[options.color])
}

/** A detail as its parts: `"Time Zone Mismatch\nThis file is…"` is a heading and its text; a plain line is text. */
export function confirmDetailParts(detail: ConfirmDetail): { title?: string, text: string } {
  if (typeof detail !== 'string') return { title: detail.title, text: detail.text ?? '' }
  const at = detail.indexOf('\n')
  return at < 0 ? { text: detail } : { title: detail.slice(0, at), text: detail.slice(at + 1) }
}

/** `confirmDelete('the Lakeside order')`: an error-colored, destructive question with Delete and Cancel. */
export function deleteOptions(what?: string, overrides?: Partial<ConfirmOptions>): ConfirmOptions {
  return {
    title: what ? `Delete ${what}` : 'Delete',
    description: what
      ? `Are you sure you want to delete ${what}? This action cannot be undone.`
      : 'Are you sure? This action cannot be undone.',
    icon: CONFIRM_DELETE_ICON,
    color: 'error',
    confirmLabel: 'Delete',
    ...overrides,
  }
}

/** `confirmDiscard()`: unsaved changes, with a red Discard and Keep Editing. Destructive: focus starts on Keep Editing. */
export function discardOptions(overrides?: Partial<ConfirmOptions>): ConfirmOptions {
  return {
    title: 'Unsaved Changes',
    description: 'You have unsaved changes. Discard them?',
    icon: CONFIRM_WARNING_ICON,
    color: 'warning',
    confirmColor: 'error',
    destructive: true,
    confirmLabel: 'Discard',
    cancelLabel: 'Keep Editing',
    ...overrides,
  }
}

/** Whether a request is destructive: its own say, else whether it, or its confirming button, is error-colored. */
export const isDestructive = (options: ConfirmBaseOptions & Pick<ConfirmOptions, 'confirmColor'>) =>
  options.destructive ?? (options.color === 'error' || options.confirmColor === 'error')

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
