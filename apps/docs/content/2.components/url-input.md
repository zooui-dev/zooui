---
title: URL input
description: A website address field that adds https:// and checks there is a real host when you leave it.
component: ZUrlInput
preview: UrlInputBasic
---

People type website addresses every which way: `example.com`, `www.example.com/about`, `http://example.com`. `ZUrlInput` is a Nuxt UI `UInput` that leaves the text alone while you type, then tidies it when you leave the field or press Enter: it trims it, puts `https://` in front, and checks that it names a real host with a top-level domain.

::component-example{name="UrlInputBasic"}
::

## What a commit does

| Typed | Committed | |
| --- | --- | --- |
| `  example.com/about ` | `https://example.com/about` | trimmed, `https://` added |
| `HTTP://Example.com/Shop` | `https://Example.com/Shop` | `http://` becomes `https://`; the rest is kept as typed |
| (blank) | `null` | |
| `localhost`, `example`, `192.168.1.10` | kept as typed | invalid: no top-level domain |
| `sam@example.com` | kept as typed | invalid: an email address, not a website |

Typing writes exactly what's in the box to `v-model`; only the commit rewrites it. Enter commits before a form's implicit submit, so a `UForm` saves the tidied address.

## Errors

`v-model:error` holds the message (`invalid-message`, "Invalid website address" by default) while the address is invalid, and `null` otherwise. It stays until the next commit, or until the parent sets another value.

In a `UFormField`, the input is marked the way Nuxt UI marks a field with an error: `aria-invalid`, the error color, and the message in its description. Bind `v-model:error` to the field's `error` and the field shows the message:

```vue
<UFormField label="Website" :error="websiteError">
  <ZUrlInput v-model="form.website" v-model:error="websiteError" class="w-full" />
</UFormField>
```

Outside a form field, the input is marked the same way and `v-model:error` is yours to show wherever suits. Give it an `aria-label`.

In a `UForm`, the field commits before the form validates on blur, so a rule sees the tidied address. `isWebAddress()` is the same check, auto-imported for your rules.

## `www.`

`add-www` puts `www.` in front of a two-label host: `example.com` becomes `https://www.example.com`, and `shop.example.com` is left alone. It is off by default, because plenty of real sites (`example.app`, a shop on its bare domain) have no `www` host, and the address would then lead nowhere.

```vue
<ZUrlInput v-model="site" aria-label="Website" add-www />
```

## Everything else

Every `UInput` prop passes through: `size` (or a `UFormField`'s), `icon`, `disabled`, `variant`, `ui`. The placeholder is `https://example.com` unless you set your own.
