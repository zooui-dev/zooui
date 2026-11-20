---
title: Optional date
description: A checkbox in front of a date field, for a day a record may or may not have. The date can be edited only while the box is ticked.
component: ZOptionalDate
preview: OptionalDateBasic
---

Some dates are optional by nature: an engagement that may have an end date, a return whose extension may have been filed. `ZOptionalDate` puts a checkbox in front of a [`ZDateField`](/components/date-field): while the box is off, the field is disabled and greyed out; ticked, the field takes a day and focus moves into it.

::component-example{name="OptionalDateBasic"}
::

## Off keeps the day

Unticking disables the field but leaves the day in `v-model`, so the form reads the box (`v-model:enabled`) to know whether the day counts. A day the parent sets leaves the box as it is.

For a form that saves what its model holds, add `clear-when-off`: while the box is off `v-model` holds `null` and the field shows no day. The component keeps the day, though, and ticking the box again puts it back, so a box unticked by mistake costs nothing. In this mode a day the parent sets ticks the box, and `@date-update` also fires with `null` when unticking takes a day away, the moment an inline editor saves.

```vue
<ZOptionalDate v-model="form.endDate" label="Has an end date" clear-when-off />
```

Nothing is written at mount in either mode, so loading a record never marks the form as changed: a box bound off with a day in the model shows the day greyed out.

## The box as its own value

Ticked and empty means "has an end date, not yet known", which a form may want to check before saving. `v-model:enabled` binds the box, for a record that stores the flag beside the date. Unbound, the box starts ticked when the model holds a day. The parent setting `enabled` gates the date as the user's click does.

`@enabled-change` fires with the new state when the user ticks or unticks the box, and never when the parent sets `enabled` or the day. It is the moment to fetch a default date:

```vue
<UFormField label="Extended due date">
  <ZOptionalDate
    v-model="task.extendedDueDate"
    v-model:enabled="task.hasFiledExtension"
    label="Extension filed"
    @enabled-change="(on) => on && !task.extendedDueDate && fetchDefaultDueDate()"
  />
</UFormField>
```

## Size

A surrounding `UFieldGroup`'s size wins, then a `UFormField`'s, then the `size` prop.

## In a form field

Inside a `UFormField`, the date input is the field's input: the label names it, and the help and error describe it. The checkbox has its own name, `label`, and names the date input in `aria-controls`. Outside a form field, give the date an `aria-label`. In a `UForm`, ticking or unticking the box counts as a change to the field, so a rule like "the date is required while ticked" runs again, and its error goes away when the box is unticked.

## Everything a date field takes

`v-model` is a `Temporal.PlainDate`, a `CalendarDate` or `null`, handed back in its own type, a restored day included. `model-type`, `min-value`, `max-value` and `is-date-unavailable` are the date field's, and everything else (`format`, `locale`, `clearable`, `@invalid` …) passes through to it. See [Date field](/components/date-field).

## Coming from Buoy

`ZOptionalDate` is Buoy's `UCheckboxDate`. The model is a `Temporal.PlainDate` (or a `CalendarDate`) rather than a JavaScript `Date`, so convert at the API boundary; `@enabled-changed` is now `@enabled-change`, carrying the new state; and `clear-when-off` is new. The date field's own renames are under [Date field](/components/date-field#coming-from-buoy).
