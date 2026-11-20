// The queue behind useConfirm() and <ZConfirmDialog>: requests wait in line, one is answered at a time, and each
// caller's promise settles with its own answer. Framework-free, so it is unit-tested on its own
// (scripts/confirm-queue.test.mjs); the composable keeps one queue per Nuxt app, which on the server is one per request.
//
// A SECOND CALL QUEUES, it does not replace. A caller awaiting `confirm()` has stopped mid-action to ask; replacing its
// dialog would answer that question for the person ("cancel") without them seeing it. So each request is shown in
// the order it was made, the next once the one before it is answered, and every promise settles exactly once.
// `dismissAll()` is the way out for a caller that must clear the line, such as on sign-out: every request still
// waiting, the open one included, settles with its own dismissed value.

/** One request in the queue: what to show, and the value it settles with when dismissed (Escape, close, cancel). */
export interface ConfirmQueueEntry<R, V> {
  /** Unique within the queue, so an answer meant for a dialog that has since gone cannot settle the next one. */
  readonly id: number
  readonly request: R
  readonly dismissed: V
}

export interface ConfirmQueue<R, V> {
  /** The request being asked now, or undefined when the queue is empty. */
  readonly current: ConfirmQueueEntry<R, V> | undefined
  /** How many requests are waiting behind the current one. */
  readonly waiting: number
  /** Add a request; the promise settles with the value it is answered with, or `dismissed`. */
  ask(request: R, dismissed: V): Promise<V>
  /** Answer the request `id` with `value`, if it is still the current one; otherwise nothing happens. */
  answer(id: number, value: V): void
  /** Dismiss the request `id`, if it is still the current one: it settles with its own dismissed value. */
  dismiss(id: number): void
  /** Dismiss every request, the current one first, then the rest in order. */
  dismissAll(): void
  /** Called whenever `current` changes. Returns the unsubscribe. */
  subscribe(listener: () => void): () => void
}

interface Pending<R, V> extends ConfirmQueueEntry<R, V> {
  settle(value: V): void
}

export function createConfirmQueue<R, V>(): ConfirmQueue<R, V> {
  const line: Pending<R, V>[] = []
  const listeners = new Set<() => void>()
  let nextId = 1

  const notify = () => { for (const listener of listeners) listener() }

  function settleHead(id: number, value: (head: Pending<R, V>) => V) {
    const head = line[0]
    if (!head || head.id !== id) return
    line.shift()
    head.settle(value(head))
    notify()
  }

  return {
    get current() {
      const head = line[0]
      return head && { id: head.id, request: head.request, dismissed: head.dismissed }
    },
    get waiting() {
      return Math.max(0, line.length - 1)
    },
    ask(request, dismissed) {
      return new Promise<V>((resolve) => {
        line.push({ id: nextId++, request, dismissed, settle: resolve })
        if (line.length === 1) notify()
      })
    },
    answer(id, value) {
      settleHead(id, () => value)
    },
    dismiss(id) {
      settleHead(id, (head) => head.dismissed)
    },
    dismissAll() {
      if (!line.length) return
      for (const entry of line.splice(0)) entry.settle(entry.dismissed)
      notify()
    },
    subscribe(listener) {
      listeners.add(listener)
      return () => { listeners.delete(listener) }
    },
  }
}
