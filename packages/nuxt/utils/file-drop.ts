// Files dropped on a page, sorted the way a native <input type="file"> would take them: `accept` in the input's own
// syntax (MIME types, `type/*`, `.ext`, comma-separated), and one file unless `multiple`. Used by ZFileDropOverlay;
// a product can hold its own drop zones or inputs to the same rule.
//
// Framework-free: Nuxt auto-imports it in a product.

/** A file the drop did not take, and why: its type isn't in `accept`, or it came after the first without `multiple`. */
export interface RejectedFile {
  file: File
  reason: 'accept' | 'multiple'
}

/** What a file needs for matching: a `File`, or anything with its name and MIME type. */
type Named = Pick<File, 'name' | 'type'>

/** The valid tokens of an `accept` value, lower-cased; tokens the input would ignore are dropped. */
function acceptTokens(accept: string | readonly string[] | undefined): string[] {
  const list = accept === undefined ? [] : typeof accept === 'string' ? accept.split(',') : accept.flatMap((a) => a.split(','))
  return list
    .map((t) => t.trim().toLowerCase())
    .filter((t) => /^\.[^./\s][^/\s]*$/.test(t) || /^[a-z0-9!#$&^_.+-]+\/(\*|[a-z0-9!#$&^_.+-]+)$/.test(t))
}

/**
 * Whether `accept` takes the file, as the native input reads it: `.pdf` matches the name's ending (any case),
 * `image/*` the MIME type's first half, `application/pdf` the whole type. An empty `accept`, or one with no valid
 * token, takes every file.
 */
export function fileMatchesAccept(file: Named, accept?: string | readonly string[]): boolean {
  const tokens = acceptTokens(accept)
  if (!tokens.length) return true
  const name = file.name.toLowerCase()
  const type = file.type.toLowerCase().split(';')[0]!.trim()
  return tokens.some((t) => {
    if (t.startsWith('.')) return name.endsWith(t)
    if (t.endsWith('/*')) return type.startsWith(t.slice(0, -1))
    return type === t
  })
}

/**
 * The dropped files, split into the ones taken and the ones refused, in drop order. Without `multiple`, the first
 * file `accept` takes is the one taken, and later matching files are refused as `multiple`.
 */
export function sortDroppedFiles(
  files: Iterable<File>,
  options: { accept?: string | readonly string[]; multiple?: boolean } = {},
): { accepted: File[]; rejected: RejectedFile[] } {
  const accepted: File[] = []
  const rejected: RejectedFile[] = []
  for (const file of files) {
    if (!fileMatchesAccept(file, options.accept)) rejected.push({ file, reason: 'accept' })
    else if (!options.multiple && accepted.length) rejected.push({ file, reason: 'multiple' })
    else accepted.push(file)
  }
  return { accepted, rejected }
}

/** Whether a drag carries files from outside the page, rather than text, a link or an element dragged within it. */
export function dragCarriesFiles(dataTransfer: Pick<DataTransfer, 'types'> | null | undefined): boolean {
  return !!dataTransfer && Array.from(dataTransfer.types).includes('Files')
}
