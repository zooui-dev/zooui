---
title: Notify
description: Toasts in one line with useNotify(), each tone with its color, icon and duration, and errorMessage() for turning a caught error into readable text.
---

Nuxt UI's `useToast().add()` takes a color, an icon, a duration and a close button on every call. `useNotify()` sets them per tone, so a toast is one line. Both helpers are auto-imported from `@zooui/nuxt`; toasts render in `<UApp>`, as Nuxt UI's own do.

```ts
const notify = useNotify()

notify.success('Project saved')
notify.warning('Two tasks have no owner', 'Assign them before the sprint starts.')

try { await $fetch('/api/projects', { method: 'POST', body }) }
catch (err) { notify.error('Couldn’t save the project', err) }
```

::component-example{name="NotifyTones"}
::

## The tones

| Call | Color | Icon |
| --- | --- | --- |
| `notify.success(title, description?, options?)` | `success` | `i-lucide-check` |
| `notify.info(…)` | `info` | `i-lucide-info` |
| `notify.warning(…)` | `warning` | `i-lucide-triangle-alert` |
| `notify.error(…)`, also `notify.danger(…)` | `error` | `i-lucide-octagon-alert` |
| `notify.primary(…)` | `primary` | `i-lucide-check` |

Each lasts 3000 ms and has a close button, and each returns Nuxt UI's toast, with its `id`. The description can be the caught error itself: anything that isn't a string goes through `errorMessage()`. The third argument takes any of Nuxt UI's toast options (`duration`, `actions`, `icon`, `close` …) and wins over the tone's. `add`, `update`, `remove` and `clear` are Nuxt UI's own.

```ts
notify.success('Task archived', undefined, { actions: [{ label: 'Undo', onClick: restore }] })
```

## Defaults in app.config

```ts
export default defineAppConfig({
  zooui: {
    notify: {
      duration: 4000,
      tones: { error: { duration: 8000 }, success: { icon: 'i-lucide-circle-check' } },
    },
  },
})
```

## errorMessage()

`errorMessage(err)` returns the readable part of a caught error. For a `$fetch` error it reads the response body first, then the error itself:

1. a product's own extractor, when it returns text
2. a list of errors, `validationErrors` or `errors`: an array or a record of field messages, joined with ", "
3. `detail`, as in RFC 9457 problem details
4. `error`, a string or a nested object
5. `message`
6. `title`, last, because a problem's title is its generic summary
7. the error's own `message`, then `String(err)`, and "An error occurred" when there is nothing readable

A product with its own error shape reads it first:

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
