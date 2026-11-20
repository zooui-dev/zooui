# ZUrlInput

A website address field (`components/UrlInput.vue`): Nuxt UI's `UInput` (placeholder `https://example.com`) that
tidies the address when it is committed, and marks it invalid when it isn't one. It is `type="text"` with
`inputmode="url"` and `autocomplete="url"`, so phones show the url keyboard and the browser offers addresses, but the
browser's own url check never stops a form's submit before the form's rules (and Nuxt UI's error styling) run.

```vue
<UFormField label="Website" :error="websiteError">
  <ZUrlInput v-model="form.website" v-model:error="websiteError" class="w-full" />
</UFormField>
<ZUrlInput v-model="shop.url" aria-label="Shop website" add-www />
```

- **Typing writes the text as it is.** Every keystroke updates `v-model` with exactly what's in the box (an emptied
  box is `""`); nothing is rewritten while you type.
- **Leaving the field (or pressing Enter) commits it** (`commitWebAddress`, `utils/url-input.ts`):
  - the text is trimmed;
  - `https://` is put in front, in place of an `http://` or `https://` in any case; no other scheme is read, so
    `ftp://example.com` fails the check rather than passing as something else;
  - the address is checked for a real host: https, no user name or password (an email address typed into the box),
    at least two labels after any `www.`, each of letters, digits, hyphens and underscores, and a top-level domain
    of two or more letters (or an internationalized `xn--…` one). `localhost`, `example`, `192.168.1.10` and
    `www.com` are refused.

  An address is written back normalized (its case, path, query and fragment kept as typed); blank text becomes
  `null`; anything else is kept, trimmed, and the field is marked invalid. Enter commits before a form's implicit
  submit, so a `UForm` submits the normalized address.
- **The error** is `v-model:error`: `invalid-message` (default `"Invalid website address"`) while the address is
  invalid, `null` otherwise. It stays until the next commit (typing doesn't clear it) or until the parent sets a
  different value (a reset, a loaded record). A parent may set an error of its own the same way.
  - *In a `UFormField`*, the input takes `aria-invalid`, Nuxt UI's error color and `aria-describedby` from the
    field, so while there is an error the field the input sees carries it (unless the field has an error of its own).
    Bind `v-model:error` to the field's `error` to show the message; unbound, the input is still marked, and a
    visually hidden message tells a screen reader why.
  - *Outside one*, the input gets `color="error"`, `highlight` and `aria-invalid` directly, described by the same
    hidden message; show `v-model:error` wherever suits.
- **In a `UForm`**, the commit happens before the input's own blur, which is where the form validates on blur: its
  rules see the committed address. `isWebAddress(value)` is the same check for a rule (auto-imported, with
  `normalizeWebAddress` and `commitWebAddress`):

  ```ts
  const validate = (s: typeof state) =>
    s.website && !isWebAddress(s.website) ? [{ name: 'website', message: 'Enter an address like example.com' }] : []
  ```
- **`add-www`** (default `false`) puts `www.` in front of a host of exactly two labels: `example.com` becomes
  `https://www.example.com`, while `shop.example.com` is left alone. It's off by default because many real sites
  (`example.app`, a shop on its bare domain) have no `www` host, and the address would then lead nowhere; turn it on
  only where the addresses are known to want it.
- **Everything else is `UInput`'s**: `size` (or a `UFormField`'s or `UFieldGroup`'s), `icon`, `disabled`, `variant`,
  `class`, `ui` and the rest pass through. No icon is rendered by default.

| Prop | Type | Default | |
| --- | --- | --- | --- |
| `v-model` | `string \| null` | `null` | the text as typed, then the committed address |
| `v-model:error` | `string \| null` | `null` | the message while invalid |
| `add-www` | `boolean` | `false` | `www.` in front of a two-label host |
| `invalid-message` | `string` | `"Invalid website address"` | the error, for another wording or language |
| `placeholder` | `string` | `"https://example.com"` | |

Emits `update:modelValue` (each keystroke, and the commit when it changes the value) and `update:error`. No slots or
exposed methods of its own. Tested by `scripts/url-input.test.mjs`, `apps/base/tests/url-input.spec.ts` and
`apps/forest/tests/url-input.spec.ts`.
