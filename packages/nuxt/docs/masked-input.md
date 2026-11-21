# ZMaskedInput

A text input with a mask: `(555) 123-4567`, `123-45-6789`, `AB-1234`. It is Nuxt UI's `UInput`: every other
attribute (`size`, `color`, `placeholder`, `disabled`, `readonly`, `ui`, `aria-*`, `class`) falls through to it. The
mask rules are `utils/masked-input.ts`, framework-free, auto-imported in a product and importable anywhere as
`@zooui/nuxt/masked-input`; they are tested by `scripts/masked-input.test.mjs`.

| Prop | | |
| --- | --- | --- |
| `modelValue` | `string \| null` | The text as shown. `null` when empty |
| `raw` | `string \| null` | `v-model:raw`: the value without its literals (`"5551234567"`), every character a token takes. Set from outside, it is formatted by the mask |
| `mask` | `string \| string[]` | A pattern (`#` digit, `A` letter, `*` either, `\` makes the next character literal, anything else a literal), or a list chosen as it is typed ([below](#choosing-a-mask)). A preset's when unset |
| `tokens` | `Record<string, { pattern: RegExp, transform?: (c) => string }>` | Token characters added to `#`, `A`, `*`; one for the same character replaces it |
| `preset` | `'phone' \| 'tax-id'` | A mask, a `formatOn` and the input's attributes, each overridable ([below](#presets)) |
| `formatOn` | `'input' \| 'blur'` | When the mask is written: every keystroke, or when the field is left. A preset's when unset, else `input` |

Emits `update:modelValue` and `update:raw`; no slots. Exposes `complete` and `isValid` (the same: every character the
mask holds is in, written in it; in blur mode, as the commit will write it), `raw`, `commit()` (write the mask now, as
leaving the field does) and `inputRef`. Keeps `data-masked-input` on the `<input>`, and `data-complete` while it is
whole. A mask of digits only sets `inputmode="numeric"`.

## Presets

| Preset | Mask | Formats | Attributes |
| --- | --- | --- | --- |
| `phone` | `(###) ###-####` | on blur | `type="tel"`, `inputmode="tel"`, `autocomplete="tel"` |
| `tax-id` | `###-##-####` (SSN), `##-#######` (EIN) | as typed | `inputmode="numeric"`, `placeholder="SSN or EIN"` |

Both are **US** formats. On blur the phone is formatted only when the field holds ten digits and nothing else
(`555.123.4567` → `(555) 123-4567`); anything else, `+44 20 7946 0958` say, is left as typed, so the default blur mode
takes a number from anywhere. `format-on="input"` formats it as typed, and then only digits get in. Fixed masks don't
fit numbers outside the US; for them, keep the blur mode or give `ZMaskedInput` a mask of your own.

## Choosing a mask

With a list, the mask is chosen on every change:

- **by the separator typed**: a literal typed where the mask in use has none, but another mask has it right there,
  chooses that mask. In `tax-id`, a dash after two digits chooses the EIN. The choice holds until the field is empty,
  or its whole text is replaced (select all and type or paste). A separator left behind by a deletion never chooses;
  a value set from outside is read whole, so `12-3456789` comes in as an EIN;
- otherwise **the first that fits**: the first mask that holds every character typed, else the first that holds the
  most. `['#####', '#####-####']` is `12345` until a sixth digit makes it `12345-6`.

A mask's literals are written once a character follows them (`123`, then `123-4`); in a mask a separator chose they are
written as soon as the characters before them are in (`12-`), and a mask's closing literal once it is full (`(12)`).

## Typing

Each keystroke, paste, drop and deletion is worked out before the browser applies it (`beforeinput`): characters no
token takes are dropped from a paste and a key of them is refused, leaving a selection selected; a key into a full
field is refused rather than pushing a character out (a paste over a selection keeps what fits). The caret is counted
in characters, not text, so it stays on the same character as literals come and go, after a paste included. Backspace
or Delete next to a literal takes the character beyond it, Backspace leaving the caret where that character was and
Delete where it is; Backspace at the end just after the separator that chose the mask (`12-|`) takes the separator and
the choice. Anything else (an IME, undo, autofill, a cut) is tidied after it lands, and an IME's composition is left
alone until it ends. In blur mode typing is free, and the model is the text as typed.

**Commit timing.** The blur-mode commit runs in the capture phase of the field's `change` and `blur` events, on the
component's own `display: contents` wrapper, so it lands before `UInput`'s handlers tell a `UFormField` to validate:
a `UForm` rule reads the formatted value on change and on blur. `commit()` runs the same thing from code.

**Validation.** `isMaskComplete(text, mask)` is the same check as `complete`, for a form rule or a server route;
`commitMasked(text, mask)` the blur commit, `unmaskedValue(text, mask)` the raw value, and `MASK_PRESETS` the presets.
The field never marks itself invalid: the rule is the form's. A `UFormField`'s error colors it and describes it, as on
any `UInput`.
