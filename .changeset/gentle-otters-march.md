---
type: feat
"@zooui/nuxt"
---

Add ZMaskedInput, a text input that writes a value in a fixed shape, with US phone and tax-ID presets.

- `mask` takes a pattern (`#` digit, `A` letter, `*` either) or a list of masks chosen as you type
- `preset="phone"` formats a US number on blur and leaves any other number as typed; `preset="tax-id"` takes an SSN, or an EIN after a dash
- `format-on` chooses formatting as you type or on blur, before a form validates
- `v-model:raw` gives the value without its separators, and `isValid` says when it is complete