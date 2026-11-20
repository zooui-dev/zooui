// A website address, as a person types one into a form: "example.com", "www.example.com/about", "http://example.com".
// ZUrlInput runs commitWebAddress on blur; a product can run the same checks in its own form rules.
//
// NORMALIZING. The text is trimmed; an `http://` or `https://` in front (in any case) is replaced by `https://`, and
// anything without one gets `https://` added. Only http and https are read as schemes: "ftp://example.com" becomes
// "https://ftp://example.com", which then fails the check rather than passing as something it isn't. The rest of
// the text is kept as typed (its case, path, query and fragment): the value is the person's address, not the URL
// parser's rewrite of it.
//
// `www.` IS OPT-IN. With `addWww`, a host of exactly two labels ("example.com", not "app.example.com") gets `www.` in
// front. That is wrong for many real sites — "example.app" or a bare-domain shop may have no `www` host at all, and
// the address would then point nowhere — so it is off unless a product knows its addresses want it.
//
// CHECKING. A web address is https, with no user name or password (an email address typed in the wrong box,
// "sam@example.com", parses as a URL with a user), and a host of at least two labels after any leading `www.`:
// letters, digits, hyphens and underscores, no empty label, and a top-level domain of two or more letters (or an
// internationalized one, `xn--…`). So "localhost", "example", "example.", "192.168.1.10" and "www.com" are refused.
// Hosts are read as the URL parser reads them, so "bücher.de" is checked as "xn--bcher-kva.de" and passes.
//
// Framework-free: Nuxt auto-imports it in a product.

export interface WebAddressOptions {
  /** Add `www.` in front of a two-label host ("example.com" → "www.example.com"). Off by default. */
  addWww?: boolean
}

export interface WebAddressCommit {
  /** What the field should hold: the normalized address, the trimmed text when it isn't one, or null when empty. */
  value: string | null
  /** False when there was text and it isn't a web address. */
  valid: boolean
}

const SCHEME = /^https?:\/\//i
const LABEL = /^[a-z0-9_](?:[a-z0-9_-]{0,61}[a-z0-9_])?$/
const TLD = /^(?:[a-z]{2,63}|xn--[a-z0-9-]{1,59})$/

/** The text as an https address: trimmed, `https://` in front, `www.` added when asked. Empty text stays empty. */
export function normalizeWebAddress(text: string, options: WebAddressOptions = {}): string {
  let rest = text.trim()
  if (!rest) return ''
  rest = rest.replace(SCHEME, '')
  if (options.addWww) {
    // The host is what comes before the path, query or fragment, without a port.
    const host = (rest.split(/[/?#]/, 1)[0] ?? '').replace(/:\d*$/, '')
    if (!/^www\./i.test(host) && host.split('.').length === 2) rest = `www.${rest}`
  }
  return `https://${rest}`
}

/** Whether an address (as normalizeWebAddress writes one) is https to a real host with a top-level domain. */
export function isWebAddress(address: string): boolean {
  let url: URL
  try {
    url = new URL(address)
  } catch {
    return false
  }
  if (url.protocol !== 'https:' || url.username || url.password) return false
  const labels = url.hostname.replace(/^www\./, '').split('.')
  if (labels.length < 2 || !labels.every((label) => LABEL.test(label))) return false
  return TLD.test(labels[labels.length - 1]!)
}

/** What a field holds once its text is committed (on blur): see WebAddressCommit. */
export function commitWebAddress(text: string, options: WebAddressOptions = {}): WebAddressCommit {
  const trimmed = text.trim()
  if (!trimmed) return { value: null, valid: true }
  const address = normalizeWebAddress(trimmed, options)
  return isWebAddress(address) ? { value: address, valid: true } : { value: trimmed, valid: false }
}
