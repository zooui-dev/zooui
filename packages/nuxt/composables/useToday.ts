import { Temporal } from 'temporal-polyfill/implementation'

/**
 * The USER's today: the calendar day where the person at the keyboard is sitting, from the browser's own time zone.
 * It is what ZDateField means by "today" — the `t` shortcut, a bare "12" typed for the 12th of this month, the month
 * the calendar opens on.
 *
 * Client-only, on purpose. During SSR the only zone available is the server's, which for an evening user in
 * California is already tomorrow; a field that rendered with that would show the wrong day until hydration fixed it,
 * or not at all. ZDateField only asks for today from event handlers and from a popover that opens on a click, both
 * of which run in the browser.
 *
 * Server code that needs "today" for the business — what's overdue, which week a forecast starts — wants the
 * COMPANY's today instead: `Temporal.Now.plainDateISO(companyTimeZone)`, not this.
 */
export function useToday(): Temporal.PlainDate {
  if (import.meta.server) throw new Error('useToday() reads the browser\'s day; call it from client code only')
  return Temporal.Now.plainDateISO()
}
