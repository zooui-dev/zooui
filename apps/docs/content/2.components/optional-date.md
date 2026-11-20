---
title: Optional date
description: A checkbox in front of a date field, for a day a record may or may not have. The date counts only while the box is ticked.
component: ZOptionalDate
preview: OptionalDateBasic
---

Some dates are optional by nature: an engagement that may have an end date, a return whose extension may have been filed. `ZOptionalDate` puts a checkbox in front of a [`ZDateField`](/components/date-field): while the box is off, the field is disabled and the model is `null`; ticked, the field takes a day and focus moves into it.

::component-example{name="OptionalDateBasic"}
::

## Off is null, and the day comes back

A form saves what its model holds, so while the box is off `v-model` holds `null` and the field shows no day. Unticking doesn't lose the day, though: the component keeps it, and ticking the box again puts it back, so a box unticked by mistake costs nothing. A form that never sees the box ticked again saves `null`.

`@date-update` is the date field's, and also fires with `null` when unticking takes a day away, the moment an inline editor saves.

## The box as its own value

Ticked and empty means "has an end date, not yet known", which a form may want to check before saving. `v-model:enabled` binds the box, for a record that stores the flag beside the date. Unbound, the box starts ticked when the model holds a day. A day the parent sets ticks it, and the parent setting `enabled` gates the date as the user's click does.

```vue
<UFormField label="Extended due date">
  <ZOptionalDate v-model="task.extendedDueDate" v-model:enabled="task.hasFiledExtension" label="Extension filed" />
</UFormField>
```

## In a form field

Inside a `UFormField`, the date input is the field's input: the label names it, and the help and error describe it. The checkbox has its own name, `label`, and names the date input in `aria-controls`. Outside a form field, give the date an `aria-label`. In a `UForm`, ticking or unticking the box counts as a change to the field, so a rule like "the date is required while ticked" runs again, and its error goes away when the box is unticked.

## Everything a date field takes

`v-model` is a `Temporal.PlainDate`, a `CalendarDate` or `null`, handed back in its own type, a restored day included. `model-type`, `min-value`, `max-value` and `is-date-unavailable` are the date field's, and everything else (`format`, `locale`, `clearable`, `@invalid` …) passes through to it. See [Date field](/components/date-field).
