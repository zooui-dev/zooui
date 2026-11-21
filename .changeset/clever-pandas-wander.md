---
type: feat
"@zooui/nuxt"
---

Add useNotify(), one-line toasts with a color, icon and duration per tone, and errorMessage(), which turns a caught fetch error into readable text.

- `notify.success`, `info`, `warning`, `error` and `primary` take a title and an optional description; `danger` is the same as `error`
- Pass a caught error as the description and the toast shows the server's message
- A third argument takes any Nuxt UI toast option, such as `actions` or `duration`
- Set default durations and icons in app.config under `zooui.notify`
- Read your backend's own error shape first with `zooui.errorMessage.extract`