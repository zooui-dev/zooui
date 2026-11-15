# Changelog

## 0.2.0

### 🚀 Enhancements

- [#6](https://github.com/zooui-dev/zooui/pull/6) [`88234ce`](https://github.com/zooui-dev/zooui/commit/88234ced718a983cc1f02628562ef26951b6bc10) - ZDateField takes an @internationalized/date CalendarDate as well as a Temporal.PlainDate, and hands back whichever its v-model holds, so it works with code written for Nuxt UI's UInputDate and UCalendar; model-type="calendar-date" chooses CalendarDates for a model that starts out null. It also takes Nuxt UI's min-value, max-value and is-date-unavailable: the calendar disables those days; a typed date outside them keeps the date the field had and marks the field invalid (aria-invalid, an @invalid event with a message to show); and the shortcut keys stop at the limits and skip unavailable days. Only a Gregorian CalendarDate is accepted. It is not a replacement for UInputDate: there is no range, no time and no segmented input. The parser at @zooui/nuxt/date-entry gains toPlainDate, fromPlainDate, checkDateLimits, dateLimitMessage and isDateShortcut, and applyDateShortcut takes the limits as an optional last argument.

## 0.1.1

### 📖 Documentation

- [#2](https://github.com/zooui-dev/zooui/pull/2) [`d278b48`](https://github.com/zooui-dev/zooui/commit/d278b481b0929fda838edee74af6b4d7291c7352) Thanks [@JohnCampionJr](https://github.com/JohnCampionJr)! - The README is cut down to install, use, versions and the component list; the full reference moves to docs/ in the repository.

## 0.1.0

### Minor Changes

- Initial release
