// Search for ZFilterSelect: a literal, case-insensitive substring match, and the label cut into the segments that
// matched and the ones that didn't, so the matches are drawn as <mark> elements rather than written into v-html.
// The query is text, never a pattern: `(`, `.` or `\` match themselves and nothing else.
//
// Case is folded one character at a time, the same way for the label and the query, so a match found in the folded
// text always maps back onto whole characters of the label, even where lowercasing changes a character's length
// ('İ' becomes 'i' and a combining dot).

/** A run of a label: matched by the search, or not. Joined in order, the segments are the label. */
export interface FilterSelectSegment {
  text: string
  match: boolean
}

/** The text with each character lowercased, and the span of the original each folded code unit came from. */
function fold(text: string) {
  let folded = ''
  const start: number[] = []
  const end: number[] = []
  let at = 0
  for (const ch of text) {
    const lower = ch.toLowerCase()
    for (let k = 0; k < lower.length; k++) {
      start.push(at)
      end.push(at + ch.length)
    }
    folded += lower
    at += ch.length
  }
  return { folded, start, end }
}

/** Whether `text` contains `query`, ignoring case. An empty query matches everything. */
export function filterSelectMatches(text: string, query: string): boolean {
  if (!query) return true
  return fold(text).folded.includes(fold(query).folded)
}

/** `text` cut into matched and unmatched runs for `query`, left to right, matches not overlapping. */
export function filterSelectSegments(text: string, query: string): FilterSelectSegment[] {
  if (!text) return []
  const q = query ? fold(query).folded : ''
  if (!q) return [{ text, match: false }]
  const { folded, start, end } = fold(text)
  const out: FilterSelectSegment[] = []
  const push = (from: number, to: number, match: boolean) => {
    if (to <= from) return
    const last = out.at(-1)
    if (last && last.match === match) last.text += text.slice(from, to)
    else out.push({ text: text.slice(from, to), match })
  }
  let done = 0
  for (let at = folded.indexOf(q); at !== -1; at = folded.indexOf(q, at + q.length)) {
    const from = Math.max(start[at]!, done)
    const to = end[at + q.length - 1]!
    push(done, from, false)
    push(from, to, true)
    done = Math.max(done, to)
  }
  push(done, text.length, false)
  return out
}
