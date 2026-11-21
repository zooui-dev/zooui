# useNotify and errorMessage

Toasts in one line, each tone with its own color, icon and duration (`composables/useNotify.ts`), and readable text for
whatever a `catch` caught (`utils/error-message.ts`, pointed at app.config by `plugins/error-message.ts`). Both are
auto-imported. Toasts render in `<UApp>`'s toaster, as Nuxt UI's own do.

```ts
const notify = useNotify()
notify.success('Project saved')
notify.warning('Two tasks have no owner', 'Assign them before the sprint starts.')

try { await $fetch('/api/projects', { method: 'POST', body }) }
catch (err) { notify.error('Couldn’t save the project', err) }        // the server's message, not the object

notify.success('Task archived', undefined, { actions: [{ label: 'Undo', onClick: restore }] })
const text = errorMessage(err)                                        // the same text, for the page
```

## useNotify()

| Member | |
| --- | --- |
| `success`, `info`, `warning`, `error`, `primary` `(title?, description?, options?)` | Adds a toast in that color with its icon and a close button, and returns it (Nuxt UI's `Toast`, with its `id`). `title` may be `null`. |
| `danger` | The same function as `error`, for code that calls it `danger`. |
| `add`, `update`, `remove`, `clear` | Nuxt UI's `useToast()` members, for a toast the shortcuts don't cover. |

- **`description`**: a string is shown as it is; `null`, `undefined` and `''` show none; anything else (a caught error)
  goes through `errorMessage()`. Nuxt UI would try to render an object as a component.
- **`options`**: any of Nuxt UI's toast fields (`NotifyOptions`: `duration`, `actions`, `icon`, `close`, `avatar`,
  `orientation`, `progress`, `id`, `onClick` …). They win over the tone's own.

| Tone | Color | Icon (`NOTIFY_ICONS`) | Duration |
| --- | --- | --- | --- |
| `success` | `success` | `i-lucide-check` | 3000 ms |
| `info` | `info` | `i-lucide-info` | 3000 ms |
| `warning` | `warning` | `i-lucide-triangle-alert` | 3000 ms |
| `error` (`danger`) | `error` | `i-lucide-octagon-alert` | 3000 ms |
| `primary` | `primary` | `i-lucide-check` | 3000 ms |

The colors are Nuxt UI's semantic ones, so a product's `ui.colors` and a theme's schemes carry through. The icons are in
the layer's client bundle (`Z_ICONS`).

### Defaults in app.config

```ts
export default defineAppConfig({
  zooui: {
    notify: {
      duration: 4000,                                  // every tone (default 3000)
      tones: { error: { duration: 8000 }, success: { icon: 'i-lucide-circle-check' } },
    },
  },
})
```

A call's own `options` win over a tone's, a tone's over `duration`, and that over 3000 ms. An icon a product sets here is
its own to bundle (`icon.clientBundle.icons`).

## errorMessage(err, options?)

Readable text for a caught error. A thrown `$fetch` error carries the response body in `data`: the body is read first,
then the error itself, in this order:

1. a string is its own message; `null` or `undefined` is the fallback
2. the product's own extractor (below), when it returns text
3. a list of errors, `validationErrors` then `errors`: an array, or a record of field → message or messages; each entry a
   string, or an object with `detail`, `message` or `title` (RFC 9457's `errors: [{ detail, pointer }]`). Joined with ", ".
4. `detail` (RFC 9457 problem details)
5. `error`, a string, or an object read the same way (`error: true` is skipped)
6. `message`
7. `title`: last of the body's, because a problem's title is its generic summary ("One or more validation errors
   occurred.") and the field errors beside it say more
8. the error's own `message`, then its `title`
9. `String(err)`, unless that is `[object Object]`: then the fallback, "An error occurred"

### A product's own error shape

```ts
export default defineAppConfig({
  zooui: {
    errorMessage: {
      extract: (err) => (err as { data?: { fault?: { reason?: string } } })?.data?.fault?.reason,
      fallback: 'Something went wrong',
    },
  },
})
```

`extract` is read before every shape above; returning nothing (or `''`) falls through to them. A call can pass its own
`options` (`{ extract?, fallback? }`), which replace the app's. The layer's plugin hands app.config to `errorMessage`
once, so it works anywhere, a `catch` in an event handler included; `configureErrorMessage(() => options)` does the
same outside Nuxt.

## Tests

`scripts/error-message.test.mjs` (every shape and the order between each pair), `apps/base/tests/notify.spec.ts` (each
tone's icon, color, text and duration in light and dark, the announcement, the options, a real `$fetch` error, the app's
extractor and warning duration) and `apps/forest/tests/notify.spec.ts` (each tone on the theme, and contrast on every
scheme in light and dark).
