/**
 * `errorMessage(err)`: readable text for whatever a `catch` caught, so it can go straight into a toast's description
 * (an object there would be rendered as a component) or onto the page.
 *
 *   try { await $fetch('/api/projects', { method: 'POST', body }) }
 *   catch (err) { notify.error('Couldn’t save the project', errorMessage(err)) }
 *
 * A thrown `$fetch` error carries the response body in `data`; the body is read first, then the error itself. In order:
 *
 *   1. a string is its own message; `null` or `undefined` is the fallback
 *   2. the product's own extractor (`app.config` `zooui.errorMessage.extract`), when it returns text
 *   3. a list of errors, `validationErrors` or `errors`: an array, or a record of field → message(s); each entry a
 *      string, or an object with `detail`, `message` or `title`. Joined with ", ".
 *   4. `detail` (RFC 9457 problem details)
 *   5. `error`: a string, or an object read the same way
 *   6. `message`
 *   7. `title` — last of the body's, as a problem's title is the generic summary ("Validation failed")
 *   8. the error's own `message`, then `title`, when the body had neither
 *   9. `String(err)`, unless that is "[object Object]": then the fallback ("An error occurred")
 *
 * Framework-free (scripts/error-message.test.mjs); plugins/error-message.ts points it at app.config.
 */

/** A product's own reader for its backend's error shape. Return the text, or nothing to fall through to the rest. */
export type ErrorMessageExtractor = (error: unknown) => string | null | undefined

export interface ErrorMessageOptions {
  /** Read first, before any of the shapes Zoo UI knows. */
  extract?: ErrorMessageExtractor
  /** The text when nothing readable is found. Default: "An error occurred". */
  fallback?: string
}

export const ERROR_MESSAGE_FALLBACK = 'An error occurred'

type Bag = Record<string, unknown>

const isBag = (v: unknown): v is Bag => typeof v === 'object' && v !== null
const text = (v: unknown): string | undefined => (typeof v === 'string' && v !== '' ? v : undefined)

/** One entry of an `errors` list: a string, a number, a nested list, or an object with detail/message/title. */
function entries(value: unknown): string[] {
  if (typeof value === 'string') return value ? [value] : []
  if (typeof value === 'number') return [String(value)]
  if (Array.isArray(value)) return value.flatMap(entries)
  if (isBag(value)) {
    const own = text(value.detail) ?? text(value.message) ?? text(value.title)
    return own ? [own] : []
  }
  return []
}

/** `errors: ['a', 'b']`, `errors: [{ detail, pointer }]` or `errors: { name: ['Required'], email: 'Taken' }`. */
function list(value: unknown): string | undefined {
  if (!isBag(value)) return undefined
  const found = Array.isArray(value) ? entries(value) : Object.values(value).flatMap(entries)
  return found.length ? found.join(', ') : undefined
}

/** The shapes of a body, steps 3 to 7. `depth` stops an `error` that nests forever. */
function fromBody(body: Bag, depth: number): string | undefined {
  const nested = depth < 3 && isBag(body.error) ? fromBody(body.error, depth + 1) : undefined
  return list(body.validationErrors) ??
    list(body.errors) ??
    text(body.detail) ??
    text(body.error) ??
    nested ??
    text(body.message) ??
    text(body.title)
}

let configured: () => ErrorMessageOptions | undefined = () => undefined

/** Where `errorMessage` finds its options when a call gives none: the app's `zooui.errorMessage` (set by the layer's
 *  plugin). A getter, so a later `updateAppConfig` is seen. */
export function configureErrorMessage(options: () => ErrorMessageOptions | undefined) {
  configured = options
}

/** Readable text for a caught error: the response body's message, the error's own, or the fallback. */
export function errorMessage(error: unknown, options: ErrorMessageOptions = configured() ?? {}): string {
  const fallback = options.fallback ?? ERROR_MESSAGE_FALLBACK
  if (typeof error === 'string') return error
  if (error === null || error === undefined) return fallback

  const own = text(options.extract?.(error))
  if (own) return own

  if (isBag(error)) {
    const body = isBag(error.data) ? error.data : error
    const found = fromBody(body, 0) ?? text(error.message) ?? text(error.title)
    if (found) return found
  }
  const plain = String(error)
  return plain === '[object Object]' ? fallback : plain
}
