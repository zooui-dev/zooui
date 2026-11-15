---
type: feat
"@zooui/nuxt"
---

ZDateField takes an @internationalized/date CalendarDate as well as a Temporal.PlainDate, and hands back whichever its v-model holds, so it works with code written for Nuxt UI's UInputDate and UCalendar; model-type="calendar-date" chooses CalendarDates for a model that starts out null. It also takes Nuxt UI's min-value, max-value and is-date-unavailable: the calendar disables those days; a typed date outside them keeps the date the field had and marks the field invalid (aria-invalid, an @invalid event with a message to show); and the shortcut keys stop at the limits and skip unavailable days. Only a Gregorian CalendarDate is accepted. It is not a replacement for UInputDate: there is no range, no time and no segmented input. The parser at @zooui/nuxt/date-entry gains toPlainDate, fromPlainDate, checkDateLimits, dateLimitMessage and isDateShortcut, and applyDateShortcut takes the limits as an optional last argument.