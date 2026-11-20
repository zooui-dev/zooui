# ZOptionalDate

An optional date (`components/OptionalDate.vue`): a checkbox in front of a [`ZDateField`](date-field.md), for a day a
record may or may not have, such as "Has an end date" or "Extension filed". The date is editable, and counts, only
while the box is ticked.

```vue
<UFormField label="Ends"><ZOptionalDate v-model="form.endDate" label="Has an end date" clearable /></UFormField>
<UFormField label="Extended due date">
  <ZOptionalDate v-model="task.extendedDueDate" v-model:enabled="task.hasFiledExtension" label="Extension filed" />
</UFormField>
```

- **A wrapper, not a prop on `ZDateField`.** The box brings its own model (`enabled`), its own name and its own
  rules for what the date holds, none of which a plain date field needs; as a prop they would sit on every
  `ZDateField` for the few that want them. As a wrapper, `ZDateField` stays one day in one box.
- **The model is `null` while the box is off.** A form saves what its model holds, and a day behind an unticked box
  must not be saved. The field is disabled and shows no day, since it never shows one the form isn't holding.
- **Unticking remembers the day; ticking puts it back.** The day is kept by the component, not in the model, so a box
  unticked by mistake costs nothing, and a form that never sees it tick again saves `null`. The day kept is the one the
  field held at the moment the box went off (an edit included). A day the parent sets replaces it.
- **The box.** `v-model:enabled` is whether it is ticked. Ticked and empty is a state of its own ("has an end date,
  not yet known", which a form may want to validate), so the box is not read off the date. Unbound, it starts ticked
  when the model holds a day. A day the parent sets ticks it; the parent setting `enabled` to `false` takes the day
  away (kept for a tick, as the user's untick does) and `true` brings it back. Bound to `false` at mount with a day in
  the model, the box wins: the model is set to `null` and the day kept for a tick.
- **Focus.** A tick by the user, by click or by Space, moves focus into the date field, ready to type; the parent
  ticking it moves nothing. Unticked, the disabled field is out of the tab order.
- **In a `UFormField`** the date input is the field's input: the label names it, and the field's help and error
  describe it (`aria-describedby`, `aria-invalid`, Nuxt UI's error color), as for a bare `ZDateField`. The checkbox is
  named by **`label`** (`"Set a date"` by default; write the product's own) and kept out of the form field, since an
  input in a `UFormField` takes the field's id and two can't share one; it names the date input in `aria-controls`.
  Outside one, name the date with an `aria-label`, which passes through. In a `UForm`, a tick or untick by the user
  is reported to the form as a change of the field's `name`, so a rule such as "the date is required while ticked"
  is checked again and its error goes when the box goes off.
- **Either type of day and the limits.** `v-model` is a `Temporal.PlainDate`, a `CalendarDate` or `null`, and is
  handed back in its own type, a restored day included. `model-type`, `min-value`, `max-value` and
  `is-date-unavailable` are `ZDateField`'s, typed on the model. Everything else (`format`, `locale`, `clearable`,
  `placeholder`, `icon`, `ui`, `@invalid`, `@clear`, `@icon-click` …) passes through to the `ZDateField`.
- **`@date-update`** is `ZDateField`'s, and also fires with `null` when unticking takes a day away (an inline editor
  saves then). A restored day is announced by the field when focus leaves it, as any settle is.
- **`disabled`** disables the box and the date; `size` (or the `UFormField`'s) sizes both.
- **Exposed `focus()`** focuses the date field while the box is ticked, and the box while it isn't.
- **Look.** The checkbox sits in a segment joined to the field's start edge, on Nuxt UI's `bg-default` and
  `ring-accented`, so a product's palette and dark mode reach it. A `class` goes on the outer element; `w-full` makes
  the field take the rest of the width.

Its tests are `apps/base/tests/optional-date.spec.ts` (`pages/optional-date.vue`) and the Forest specimen's in
`apps/forest/tests/optional-date.spec.ts`.
