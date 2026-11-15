// Forest's faces as the page computes them, for page.evaluate. Both functions run INSIDE the page (page.evaluate
// serializes them), so each stays self-contained: no imports, no helpers outside its own body.

/**
 * Each role's family and OpenType set as the six --zoo-* hooks resolve right now, normalized by the browser (a
 * probe element computes them), so they compare equal to what an element computes.
 */
export function roleFaces() {
  const probe = document.body.appendChild(document.createElement('div'))
  const out: Record<string, { family: string, features: string }> = {}
  for (const role of ['sans', 'mono', 'display']) {
    probe.style.fontFamily = `var(--zoo-font-${role})`
    probe.style.fontFeatureSettings = `var(--zoo-features-${role})`
    const s = getComputedStyle(probe)
    out[role] = { family: s.fontFamily, features: s.fontFeatureSettings }
  }
  probe.remove()
  return out
}

/**
 * Every rendered element with its own text whose OpenType set is not one its face's role declares: a bare mono
 * span keeping the sans set it inherited, a `font:` shorthand resetting the set. The roles are read from the hooks
 * in force, so this judges Forest's defaults and any override of them (the AT faces) alike. One line per offender,
 * deduplicated.
 *
 * Two roles on the SAME family with DIFFERENT sets (Forest's sans and display are both Inter) cannot be told apart
 * by the face an element computes, so that pair is reported as a line of its own rather than merged: merging would
 * let an element in either set pass, and the guard would go blind without saying so.
 */
export function findFaceMismatches(): string[] {
  const probe = document.body.appendChild(document.createElement('div'))
  const first = (stack: string) => stack.split(',')[0]!.trim()
  const roles = new Map<string, { role: string, features: string }>()
  const out = new Set<string>()
  for (const role of ['sans', 'mono', 'display']) {
    probe.style.fontFamily = `var(--zoo-font-${role})`
    probe.style.fontFeatureSettings = `var(--zoo-features-${role})`
    const s = getComputedStyle(probe)
    const face = first(s.fontFamily)
    const seen = roles.get(face)
    if (!seen) roles.set(face, { role, features: s.fontFeatureSettings })
    else if (seen.features !== s.fontFeatureSettings) {
      out.add(`${seen.role} and ${role} share ${face} with different sets (${seen.features} / ${s.fontFeatureSettings}): elements cannot be judged by face`)
    }
  }
  probe.remove()
  for (const el of document.body.querySelectorAll('*')) {
    if (el.closest('svg')) continue
    if (![...el.childNodes].some((n) => n.nodeType === 3 && n.textContent!.trim())) continue
    const s = getComputedStyle(el)
    if (s.display === 'none' || s.visibility === 'hidden') continue
    const face = first(s.fontFamily)
    const expected = roles.get(face)
    if (expected && expected.features !== s.fontFeatureSettings) {
      out.add(`${face} with ${s.fontFeatureSettings} on <${el.tagName.toLowerCase()} class="${el.getAttribute('class') ?? ''}">`.slice(0, 200))
    }
  }
  return [...out]
}
