// "Nothing selected", as a value a select can actually hold. Named so it
// can sit in an auto-import list beside every other name a product has: `NONE` and `orNull` are not
// something to claim globally.
//
// reka-ui THROWS if a SelectItem carries `value=""` — it reserves the empty string for "no selection, show
// the placeholder", so an explicit "No project" option cannot use it. The throw happens during render, which
// aborts the patch: the practical symptom is not an error anyone sees but a modal that will not close and a
// field that appears to reset itself. (Nuxt UI's USelect and USelectMenu are built on reka-ui.)
//
// So the option travels as this sentinel and is translated back at the edge, where the API wants either a
// uuid or nothing at all.
//
// Framework-free: Nuxt auto-imports it in a product.
export const SELECT_NONE = '__none__'

/** The value to send for a select whose "none" option is chosen. */
export const selectNoneToUndefined = (v: string | undefined | null) => (!v || v === SELECT_NONE ? undefined : v)

/** The same, for update endpoints where clearing a field means an explicit null. */
export const selectNoneToNull = (v: string | undefined | null) => (!v || v === SELECT_NONE ? null : v)

/** What to show in the box for a value that may be absent. */
export const emptyToSelectNone = (v: string | undefined | null) => v || SELECT_NONE
