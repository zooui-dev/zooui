# ZNumberInput

One number input, so every figure looks and moves the same, formatting as it is typed. It is Nuxt UI's `UInput` (`type="text"`, `inputmode="decimal"`): every other attribute, `size`,
`color`, `highlight`, `disabled`, `readonly`, `ui`, `aria-*`, falls through to it, the marks and chevrons sit in its
`leading` and `trailing` slots, and calc's preview in its default slot. It is on Nuxt UI's tokens: marks and chevrons
in `text-dimmed`, hover `text-default`, the preview `bg-inverted`/`text-inverted`.

| Prop | | |
| --- | --- | --- |
| `modelValue` | `string \| number \| Decimal \| null` | Every change hands back the caller's kind: a string stays a string (as typed: `"1.0"` on the way to `"1.05"`; written to the places on commit, `"1234.50"`), a number a number, a decimal.js `Decimal` a `Decimal` of the caller's own class. Cleared: `''` for a string, `null` otherwise. Strings and Decimals never pass through a float |
| `modelType` | `'string' \| 'number' \| 'decimal'` | The kind to hand back when the model starts empty (it has no value to take a kind from). A `Decimal` v-model that can start null needs `model-type="decimal"`; without it, empty starts as a string |
| `unit` | `money \| percent \| count \| hours` | `count` by default. Money puts the currency symbol on the left; percent `%` and hours `hrs` on the right, in a slot kept the same width when empty, so values end on one edge |
| `locale`, `currency` | BCP 47, ISO 4217 | The grouping and decimal marks typed and shown (`de`: `1.234,56`), the money symbol, and the chevrons' labels ("Add $5,000", "Subtract 0.5 hours") |
| `minFractionDigits`, `maxFractionDigits` | `number` | Decimal places: the minimum written on commit, the maximum rounded to on commit and the most that can be typed. Money is `2`/`2`; every other unit `0`/none (as typed). A minimum above an explicit maximum comes down to it |
| `min`, `max` | `number \| string` | Clamp a nudge and a commit. Out of range otherwise (between keystrokes, or a model that arrives so) the field is `:invalid` (`setCustomValidity`), following the model as a parent changes it; a minus can't be typed where `min` is 0 or more |
| `step` | `number` | What the chevrons and ArrowUp/ArrowDown add, from the current value, never snapped to a multiple |
| `spin` | `boolean` | `true` by default. `false`: no chevrons, ArrowUp/ArrowDown do nothing, and the field is a plain text box rather than a `spinbutton` |
| `prefix`, `suffix` | `string` | Free text beside the marks: `prefix="~"` shows `~$`, `suffix="/mo"` shows `/mo` after the value. Kept out of the text, in the mark slots, which grow to fit |
| `highlightOnFocus` | `boolean` | Select the whole value on focus, by click or key (on by default in `calc`) |
| `calc` | `boolean` | Take `+ - * /` expressions ([below](#calc)) |
| `commitOnBlur` | `boolean` | `true` by default. `false` for a grid editor that commits itself with `evaluate()` |
| `freeform` | `boolean` | A text box that takes "$125,000" or "24 %" as typed and hands the text back as it is, for a product that tidies it itself; the arrows read the figure out of it (in the field's locale) and leave anything else ("forty") untouched. No live formatting, clamping or rounding |

Emits `update:modelValue`; no slots. Exposes `evaluate()`, which commits what is typed and returns the model's value,
and `inputRef`. Keeps `data-number-input` on the `<input>` (and adds `data-unit`), `data-number-mark` on the
marks, and the chevrons' labels.

**Typing.** Each keystroke, paste and deletion is worked out before the browser applies it (`beforeinput`): the
locale's grouping comes and goes (`12,345`), the caret stays on its digit, one decimal mark, a minus only at the
front, no leading zeros. Backspace or Delete over a separator takes the digit beyond it; a fixed decimal mark is
stepped over rather than deleted; typed into a full fraction, a digit overwrites the next; typed before a minus, a
digit goes after it. A key that would add nothing (a letter, a second decimal mark, a minus where none may go) is
refused, and leaves a selection selected. A paste keeps the figure's digits (`$1,234.50` arrives as `1,234.50`).
Anything else (an IME, undo, autofill) is tidied after it lands, and keys an IME is composing with are left to it.
The model follows the typing; a **commit** (blur, Enter, Tab, or a nudge, by key or chevron alike: a chevron doesn't
take the focus) rounds to the places (half away from zero, in decimal.js), keeps the result within `min`/`max`, and
shows the value in full (`38,500.00`). A rounded value past a bound becomes the nearest value inside it that the
places can write (`max="1.235"` at two places commits `1.23`, never `1.24`); if the places can write none (`min` 0.004,
`max` 0.006, two places), the bound itself is kept.

**Marks.** The currency symbol and `prefix` stay to the left of the text and `%`, `hrs` and `suffix` to the right,
in the input's own padding, so a column of values still ends on one edge and typing only ever meets digits. A
locale that writes its symbol after the number (`de`: `1.234,56 €`) still shows `€` on the left, with the money.

**Accessibility.** While it spins the input is a `spinbutton` with `aria-valuemin`, `aria-valuemax`, `aria-valuenow`
and an `aria-valuetext` with its marks ("$38,500.00"); the chevrons are named buttons, out of the tab order (the
arrow keys do the same). With `:spin="false"` it is a plain text box.

## Calc

`calc` makes the field a small calculator: `+ - * /` with the usual precedence, read by a small
recursive-descent parser (never `eval`) and worked in decimal.js, so `0.1+0.2` is `0.3`.
Each number is grouped as it is typed, for the locale, keeping the caret. While focused, the result shows under the
field (`= $1,250.00`, with the unit's marks), absolutely placed in `UInput`'s slot so nothing moves, and announced
politely. Enter, Tab or blur (unless `:commit-on-blur="false"`) puts it in, rounded and kept in range like any commit.
The result is rounded once, at the field's places (ten where the field has no maximum), so a sum is never
rounded twice: whole dollars only is `calc :max-fraction-digits="0"`. A line break in a paste is a space. Incomplete or invalid input (`678+`, `abc`) or a division
by zero gives no value. An operator typed over a selection is added at the end (the value is
selected on focus, so `+50` adds to it), except a minus over everything, which starts a negative number. A grid
cell editor:

```vue
<ZNumberInput ref="cell" v-model="value" unit="money" calc :spin="false" :commit-on-blur="false" />
<!-- on Enter, Tab or an arrow: cell.value.evaluate(), then move -->
```

**Defaults, and a product's own.** Without props: money moves by 1, percent and count by 1, hours by 0.5, in US
dollars, `en-US` (fixed, so the server and the browser render the same text), money to 2 places. A product sets its
own once in its `app.config.ts`; a prop still wins. A product's own $5,000 step:

```ts
export default defineAppConfig({ zooui: { numberInput: { steps: { money: 5000 } } } })
// also: currency, locale, fractionDigits: { money: { min: 0, max: 0 } }
```

**Decimal.** A database client may return Postgres `numeric` as decimal.js `Decimal`s, and a schema may check
`instanceof Decimal`. ZNumberInput recognizes a `Decimal` with `Decimal.isDecimal` (which knows another copy's
instances too), reads it from its string, and builds every value it hands back with the caller's own class, so
`instanceof` holds even with two copies installed. A `Decimal.clone()` comes back the clone, with its precision, and
a subclass (`class Money extends Decimal`) comes back a subclass: decimal.js writes the class it extends onto each
instance, so for a subclass the class is read from the instance's prototype instead. The layer depends on decimal.js
`^10.6.0`, so a product that also installs decimal.js itself gets one copy: keep the product's own range compatible
with it.

**Where it lives.** The component is thin; the rules are pure TypeScript beside it: `number-format.ts` (the locale's
marks, live formatting and the caret, commits, the caller's kind of value), `number-calc.ts` (the evaluator and
expression editing) and `number-input.ts` (config, labels, nudges, freeform reading). Their tests are
`scripts/number-input.test.mjs` and `scripts/number-calc.test.mjs`.
