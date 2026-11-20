/**
 * ZRepeatingList's Cancel, apart from the component (tests: scripts/row-snapshot.test.mjs): a copy of a row taken when
 * it opens, and that copy put back into the SAME object, so the row keeps its identity (and its key) and the caller's
 * references to it stay good. Plain objects and arrays are copied all the way down and restored in place; anything
 * else (a Date, a Temporal.PlainDate, a class instance) is kept by reference, as values a field replaces rather than
 * edits.
 */

type Bag = Record<PropertyKey, unknown>

const isPlain = (v: unknown): v is Bag => {
  if (v === null || typeof v !== 'object' || Array.isArray(v)) return false
  const proto = Object.getPrototypeOf(v)
  return proto === Object.prototype || proto === null
}

/** A copy of `value`: plain objects and arrays deep, everything else as it is. */
export function snapshot<T>(value: T): T {
  if (Array.isArray(value)) return value.map((v) => snapshot(v)) as T
  if (isPlain(value)) {
    const copy: Bag = Object.create(Object.getPrototypeOf(value))
    for (const k of Object.keys(value)) copy[k] = snapshot(value[k])
    return copy as T
  }
  return value
}

/**
 * Puts `snap` (from `snapshot`) back into `target`: its fields set again, fields added since removed, and a nested
 * plain object or array restored into the one already there, so it keeps its identity too.
 */
export function restore<T extends object>(target: T, snap: T): T {
  if (Array.isArray(target) && Array.isArray(snap)) {
    target.length = snap.length
    snap.forEach((v, i) => { target[i] = restoreValue(target[i], v) })
    return target
  }
  const t = target as Bag, s = snap as Bag
  for (const k of Object.keys(t)) if (!(k in s)) Reflect.deleteProperty(t, k)
  for (const k of Object.keys(s)) t[k] = restoreValue(t[k], s[k])
  return target
}

function restoreValue(current: unknown, snap: unknown): unknown {
  if (Array.isArray(snap)) return Array.isArray(current) ? restore(current, snap) : snapshot(snap)
  if (isPlain(snap)) return isPlain(current) ? restore(current, snap) : snapshot(snap)
  return snap
}
