/**
 * Promise-based confirmation: ask, await the answer, carry on.
 *
 *   const { confirm, choose, confirmDelete, confirmDiscard } = useConfirm()
 *   if (await confirmDelete('the Lakeside order')) await remove(order)
 *   const next = await choose({ title: 'Save before leaving?', actions: [
 *     { label: 'Discard', value: 'discard', color: 'neutral', variant: 'outline' },
 *     { label: 'Save', value: 'save' },
 *   ] })                                       // 'save' | 'discard' | null
 *
 * The dialog renders in <ZConfirmDialog>, mounted once inside <UApp>. `confirm` resolves `true` when confirmed and
 * `false` when cancelled; `choose` resolves to the picked action's `value`, or `null`. Escape, the close button and a
 * click outside are all a cancel.
 *
 * One dialog at a time: a call made while one is open QUEUES behind it, and is shown when it is answered
 * (utils/confirm-queue.ts says why it doesn't replace). `dismissAll()` cancels the open one and every one waiting.
 *
 * Per request: the queue belongs to the Nuxt app (components/confirm.ts), never to the module. On the server, where
 * no one can answer, every call resolves at once as a cancel.
 */
import {
  confirmController,
  deleteOptions,
  discardOptions,
  type ChooseOptions,
  type ConfirmOptions,
} from '../components/confirm'

export type { ChooseOptions, ConfirmAction, ConfirmBaseOptions, ConfirmColor, ConfirmDetail, ConfirmOptions, ConfirmSize, ConfirmVariant } from '../components/confirm'

export function useConfirm() {
  const controller = confirmController(useNuxtApp())

  function ask<V>(request: Parameters<typeof controller.queue.ask>[0], dismissed: V): Promise<V> {
    if (import.meta.server) return Promise.resolve(dismissed)
    if (import.meta.dev && !controller.hosts) {
      console.warn('[zooui] useConfirm(): no <ZConfirmDialog> is mounted, so this question will never be shown. Mount one inside <UApp>.')
    }
    return controller.queue.ask(request, dismissed) as Promise<V>
  }

  /** Ask a yes-or-no question: `true` when confirmed, `false` when cancelled or dismissed. */
  function confirm(options: ConfirmOptions): Promise<boolean> {
    return ask({ kind: 'confirm', options }, false)
  }

  /** Offer several answers: the picked action's `value`, or `null` when cancelled or dismissed. */
  function choose<V>(options: ChooseOptions<V>): Promise<V | null> {
    return ask<V | null>({ kind: 'choose', options }, null)
  }

  /** "Delete {what}", error-colored, with Delete and Cancel; focus starts on Cancel. */
  function confirmDelete(what?: string, overrides?: Partial<ConfirmOptions>): Promise<boolean> {
    return confirm(deleteOptions(what, overrides))
  }

  /** "Unsaved Changes", with a red Discard and Keep Editing; focus starts on Keep Editing. */
  function confirmDiscard(overrides?: Partial<ConfirmOptions>): Promise<boolean> {
    return confirm(discardOptions(overrides))
  }

  /** Cancel the open question and every one waiting (on sign-out, say). */
  function dismissAll() {
    controller.queue.dismissAll()
  }

  return { confirm, choose, confirmDelete, confirmDiscard, dismissAll }
}
