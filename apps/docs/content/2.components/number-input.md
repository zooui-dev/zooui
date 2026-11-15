---
title: Number input
description: One number input for money, percent, count and hours, formatting as you type, with unit marks that line up, steps that never snap, and a calculator mode.
component: ZNumberInput
preview: NumberInputUnits
---

`ZNumberInput` is one input for every figure in a form: money, percent, count and hours. It is Nuxt UI's `UInput`, so `size`, `color`, `disabled`, `readonly` and `ui` work as they do there. It formats the value as you type. The unit marks sit in fixed slots, so a column of values lines up. The chevrons and the ArrowUp/ArrowDown keys move the value by `step` from whatever is there, never snapping it to a multiple. The arithmetic is decimal, so 0.1 and 0.2 make 0.3, and the model comes back as the type you bound: a number stays a number, a string a string, a `Decimal` a `Decimal`.

## Units

`unit` is `money` (the currency symbol on the left, from `currency` and `locale`), `percent`, `count` or `hours`.

::component-example{name="NumberInputUnits"}
::

## Typing and locales

The value is grouped as you type (`1,234,567`), and the caret stays on its digit as separators come and go. Backspace or Delete over a separator takes the digit beyond it. A key that adds nothing, such as a letter or a second decimal mark, is refused, and a pasted `$1,234.50` keeps only its figure. `locale` sets the marks typed and shown: in `de` the full stop groups and the comma is the decimal mark, so the field reads and writes `1.234,56`. The currency symbol stays on the left in every locale, with the other marks.

::component-example{name="NumberInputTyping"}
::

## Decimal places and range

`min-fraction-digits` is written on commit (blur, Enter or Tab) and `max-fraction-digits` is the most that can be typed and what a commit rounds to, half away from zero. Money defaults to two places; the other units keep what is typed. A commit also keeps the value within `min` and `max`: 12 in a field that stops at 10 becomes 10. Until then the field is `:invalid`, so a form won't submit it. A minus can't be typed where `min` is 0 or more.

::component-example{name="NumberInputPlaces"}
::

## Marks, spinning and selection

`prefix` and `suffix` add text beside the unit marks, outside the value, so typing never meets them. `:spin="false"` removes the chevrons and makes ArrowUp and ArrowDown do nothing, for a figure that isn't a quantity. `highlight-on-focus` selects the whole value when the field is focused, by click or by key.

::component-example{name="NumberInputMarks"}
::

## Calc

With `calc`, the field takes `+ - * /` with the usual precedence, worked out in decimal arithmetic by a small parser (never `eval`). Each number is grouped as you type, and the result shows under the field while it has the focus, without moving anything. Enter, Tab or blur puts the result in, rounded to the field's places and kept in range. Input that isn't a whole expression (`678+`) or divides by zero gives no value. The value is selected on focus, and an operator typed over the selection is added at the end, so `+50` adds to what is there; a minus over everything starts a negative number instead.

A grid cell editor that commits itself sets `:commit-on-blur="false"` and calls the exposed `evaluate()`, which works the expression out, hands the value back, and returns it.

::component-example{name="NumberInputCalc"}
::

## Decimal models

A `Decimal` from decimal.js, such as a Postgres `numeric` column from a database client that returns decimal.js values, is handed back as a `Decimal` of the caller's own class: typing, nudging, rounding and calc all do it, and no value passes through a float. A model that starts `null` has no class to take, so `model-type="decimal"` says what to hand back. Keep the product's decimal.js range compatible with the layer's (`^10.6.0`), so one copy is installed.

::component-example{name="NumberInputDecimal"}
::
