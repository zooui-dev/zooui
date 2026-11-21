/**
 * Toasts in one line, each tone with its own color, icon and duration, on Nuxt UI's `useToast`.
 *
 *   const notify = useNotify()
 *   notify.success('Project saved')
 *   notify.warning('Two tasks have no owner', 'Assign them before the sprint starts.')
 *   try { await save() } catch (err) { notify.error('Couldn’t save the project', err) }
 *
 * The description may be the caught error itself: anything that isn't a string goes through `errorMessage()`, so the
 * toast shows the server's message rather than trying to render the object. A third argument takes any of Nuxt UI's
 * toast options (`duration`, `actions`, `icon`, `close`, `id`, `onClick` …) and wins over the tone's own.
 *
 * Defaults in app.config:
 *
 *   zooui: { notify: { duration: 4000, tones: { error: { duration: 8000 }, success: { icon: 'i-lucide-circle-check' } } } }
 *
 * Toasts render in <UApp>'s toaster, so the app must be wrapped in one.
 */
import type { Toast } from '@nuxt/ui/composables'
import { errorMessage } from '../utils/error-message'

export type NotifyTone = 'primary' | 'success' | 'info' | 'warning' | 'error'

/** Any of Nuxt UI's toast fields; the title and description are the call's first two arguments. */
export type NotifyOptions = Omit<Partial<Toast>, 'title' | 'description'>

export interface NotifyToneConfig {
  icon?: string
  duration?: number
}

/** app.config `zooui.notify`. */
export interface NotifyConfig {
  /** Every tone's duration in ms, unless the tone sets its own. Default 3000. */
  duration?: number
  tones?: Partial<Record<NotifyTone, NotifyToneConfig>>
}

export const NOTIFY_DURATION = 3000

export const NOTIFY_ICONS: Record<NotifyTone, string> = {
  primary: 'i-lucide-check',
  success: 'i-lucide-check',
  info: 'i-lucide-info',
  warning: 'i-lucide-triangle-alert',
  error: 'i-lucide-octagon-alert',
}

/** A description, or a caught error as text; `undefined` when there is none. */
function describe(description: unknown): string | undefined {
  if (description === null || description === undefined || description === '') return undefined
  return typeof description === 'string' ? description : errorMessage(description)
}

export function useNotify() {
  const toast = useToast()
  const config = useAppConfig() as { zooui?: { notify?: NotifyConfig } }

  function show(tone: NotifyTone, title?: string | null, description?: unknown, options?: NotifyOptions): Toast {
    const own = config.zooui?.notify
    return toast.add({
      color: tone,
      icon: own?.tones?.[tone]?.icon ?? NOTIFY_ICONS[tone],
      duration: own?.tones?.[tone]?.duration ?? own?.duration ?? NOTIFY_DURATION,
      close: true,
      ...options,
      title: title ?? undefined,
      description: describe(description),
    })
  }

  type Shortcut = (title?: string | null, description?: unknown, options?: NotifyOptions) => Toast
  const tone = (t: NotifyTone): Shortcut => (title, description, options) => show(t, title, description, options)

  const error = tone('error')
  return {
    primary: tone('primary'),
    success: tone('success'),
    info: tone('info'),
    warning: tone('warning'),
    error,
    /** `error` under the name some codebases use for it. */
    danger: error,
    /** Nuxt UI's own, for a toast the shortcuts don't cover. */
    add: toast.add,
    update: toast.update,
    remove: toast.remove,
    clear: toast.clear,
  }
}
