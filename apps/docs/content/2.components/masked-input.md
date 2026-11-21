---
title: Masked input
description: A text input with a mask, for phone numbers, tax IDs, postcodes and codes. Only the characters the mask takes get in, and the caret stays put as the separators come and go.
component: ZMaskedInput
preview: MaskedInputPresets
---

`ZMaskedInput` is a text input that writes a value in a fixed shape: `(555) 123-4567`, `123-45-6789`, `AB-1234`. It is Nuxt UI's `UInput`, so `size`, `color`, `placeholder`, `disabled`, `readonly` and `ui` work as they do there. Two presets cover the common US cases, and any other shape is a `mask` away.

::component-example{name="MaskedInputPresets"}
::

## Presets

`preset="phone"` is a **US** phone number, `(555) 123-4567`. By default it is formatted when you leave the field, and only when the field holds ten digits and nothing else, so `555.123.4567` becomes `(555) 123-4567` while `+44 20 7946 0958` stays as typed. Add `format-on="input"` to format it as you type instead; then only digits get in.

`preset="tax-id"` is a US SSN (`123-45-6789`) or EIN (`12-3456789`), formatted as you type. It starts as an SSN; typing a dash after the first two digits switches it to an EIN, and it stays one until the field is emptied or its whole text replaced. A pasted `12-3456789` keeps its EIN form.

Fixed masks don't fit phone numbers outside the US, whose length and grouping vary by country. For an international number, leave the phone preset on its default blur mode (it takes any number as typed), or give `ZMaskedInput` a mask of your own.

## Your own mask

`mask` is a pattern: `#` is a digit, `A` a letter, `*` a letter or digit, and anything else is written for you. A backslash makes a token character literal (`\#`).

```vue
<ZMaskedInput v-model="code" mask="AA-####" />
```

A **list** of masks is chosen as you type. A separator typed where only another mask has one chooses that mask; otherwise the first mask that holds everything typed is used. The ZIP code below is `12345` until a sixth digit, or a dash, makes it `12345-6789`:

::component-example{name="MaskedInputCustom"}
::

`tokens` adds token characters to `#`, `A` and `*`, each with a `pattern` and an optional `transform`; one for the same character replaces it:

```vue
<ZMaskedInput
  v-model="code"
  mask="AA-####"
  :tokens="{ A: { pattern: /[a-z]/i, transform: (c) => c.toUpperCase() } }"
/>
```

## Typing

Each keystroke, paste and deletion is worked out before the browser applies it. A key the mask can't take is refused, and a full field refuses another character rather than pushing one out. The caret stays on the same character as separators come and go. Backspace or Delete next to a separator takes the character beyond it; Backspace just after the dash that chose the EIN takes the dash, and the choice with it. A paste keeps what the mask takes, so `123 45 6789` arrives as `123-45-6789`.

## Values and validation

`v-model` holds the text as shown, or `null` when the field is empty. `v-model:raw` holds the same value without its separators (`5551234567`); set it from outside and the field formats it. The component exposes `complete` (and `isValid`, the same): `true` once every character the mask holds is in. A button can wait on it:

```vue
<ZMaskedInput ref="taxField" v-model="taxId" preset="tax-id" />
<UButton label="Look up" :disabled="!taxField?.isValid" />
```

In a `UForm`, a field formatted on blur is formatted in the capture phase of its change and blur events, before Nuxt UI's input tells the form to validate, so your rules see `(555) 123-4567`, never `5551234567`. `isMaskComplete(value, mask)` checks a value against a mask in a rule, and `@zooui/nuxt/masked-input` imports it on the server too:

```ts
const validate = (s) => s.phone && !isMaskComplete(s.phone, MASK_PRESETS.phone.mask)
  ? [{ name: 'phone', message: 'Enter a phone number like (555) 123-4567' }]
  : []
```
