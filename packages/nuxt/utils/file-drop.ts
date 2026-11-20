// Files dropped on a page, sorted the way a native <input type="file"> would take them: `accept` in the input's own
// syntax (MIME types, `type/*`, `.ext`, comma-separated), and one file unless `multiple`; then a product's own `filter`
// (a size or name rule) and, optionally, no name twice. Used by ZFileDropOverlay; a product can hold its own drop zones
// or inputs to the same rule.
//
// Framework-free: Nuxt auto-imports it in a product.

/**
 * A file the drop did not take, and why: its type isn't in `accept`, `filter` refused it, its name is already held
 * (`duplicate`), or it came after the first without `multiple`.
 */
export interface RejectedFile {
  file: File
  reason: 'accept' | 'filter' | 'duplicate' | 'multiple'
  /** The message `filter` returned for it, when it returned one. */
  message?: string
}

/** A product's own rule for a file: `true` takes it; `false`, or a message saying why, refuses it. */
export type FileFilter = (file: File) => boolean | string

/** A row of ZFileList: a `File` just added, or a file already stored, by its id, with a thumbnail URL if it has one. */
export type FileListItem = File | { id: string | number; name: string; size: number; type?: string; thumbnail?: string }

/** How sortDroppedFiles sorts. */
export interface SortDroppedFilesOptions {
  /** The native input's `accept`. Unset, every type is taken. */
  accept?: string | readonly string[]
  /** Take every file the rules let through; without it, the first. */
  multiple?: boolean
  /** A product's own rule, run on each file `accept` takes. */
  filter?: FileFilter
  /** Names already held (the list the files join): a file of one of these names is refused as `duplicate`. Implies
   *  `dedupe: 'name'`. */
  existing?: Iterable<string>
  /** `'name'`: refuse a file whose name is in `existing` or came earlier in the same drop. */
  dedupe?: 'name'
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
 * The dropped files, split into the ones taken and the ones refused, in drop order. Each file is checked against
 * `accept`, then `filter`, then (with `existing` or `dedupe`) the names already held, and refused at the first that
 * says no. Without `multiple`, the first file to pass is the one taken, and later ones are refused as `multiple`.
 */
export function sortDroppedFiles(
  files: Iterable<File>,
  options: SortDroppedFilesOptions = {},
): { accepted: File[]; rejected: RejectedFile[] } {
  const accepted: File[] = []
  const rejected: RejectedFile[] = []
  const dedupe = options.dedupe === 'name' || options.existing !== undefined
  const held = new Set(options.existing ?? [])
  for (const file of files) {
    if (!fileMatchesAccept(file, options.accept)) {
      rejected.push({ file, reason: 'accept' })
      continue
    }
    const verdict = options.filter ? options.filter(file) : true
    if (verdict !== true) {
      rejected.push(typeof verdict === 'string' && verdict ? { file, reason: 'filter', message: verdict } : { file, reason: 'filter' })
    } else if (dedupe && held.has(file.name)) {
      rejected.push({ file, reason: 'duplicate' })
    } else if (!options.multiple && accepted.length) {
      rejected.push({ file, reason: 'multiple' })
    } else {
      accepted.push(file)
      held.add(file.name)
    }
  }
  return { accepted, rejected }
}

/**
 * The files a drop carries: `dataTransfer.files`, or, when a browser leaves that empty (some do, for some sources),
 * the file entries of `dataTransfer.items`.
 */
export function droppedFiles(dataTransfer: Pick<DataTransfer, 'files' | 'items'> | null | undefined): File[] {
  if (!dataTransfer) return []
  const files = Array.from(dataTransfer.files ?? [])
  if (files.length) return files
  const fromItems: File[] = []
  for (const item of Array.from(dataTransfer.items ?? [])) {
    if (item.kind !== 'file') continue
    const file = item.getAsFile()
    if (file) fromItems.push(file)
  }
  return fromItems
}

/** Whether a drag carries files from outside the page, rather than text, a link or an element dragged within it. */
export function dragCarriesFiles(dataTransfer: Pick<DataTransfer, 'types'> | null | undefined): boolean {
  return !!dataTransfer && Array.from(dataTransfer.types).includes('Files')
}

const SIZE_UNITS = ['kilobyte', 'megabyte', 'gigabyte', 'terabyte'] as const
const BINARY_UNITS = ['KB', 'MB', 'GB', 'TB'] as const

/**
 * A file's size for people, in the locale's digits. By default in steps of 1024, as Windows and most file managers
 * count, with one decimal at most: `512 B`, `1.2 KB`, `239.3 KB`, `1.7 MB` (`1,2 KB` in German). With
 * `binary: false`, decimal units as their names say (1 kB = 1000 bytes), in the locale's own words, one decimal under
 * 10 and none above: `512 bytes`, `1.2 kB`, `245 kB`.
 */
export function formatFileSize(bytes: number, locale?: string, options: { binary?: boolean } = {}): string {
  const binary = options.binary ?? true
  const step = binary ? 1024 : 1000
  const size = Number.isFinite(bytes) ? Math.max(0, bytes) : 0
  if (size < step) {
    const whole = Math.round(size)
    if (binary) return `${new Intl.NumberFormat(locale).format(whole)} B`
    return new Intl.NumberFormat(locale, { style: 'unit', unit: 'byte', unitDisplay: 'long' }).format(whole)
  }
  let value = size / step
  let unit = 0
  const digits = (v: number) => (binary || v < 10 ? 1 : 0)
  // 999,960 bytes is 1 MB, not "1,000 kB": step up whenever rounding reaches the next unit.
  while (unit < SIZE_UNITS.length - 1 && Number(value.toFixed(digits(value))) >= step) {
    value /= step
    unit += 1
  }
  if (binary) return `${new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }).format(value)} ${BINARY_UNITS[unit]}`
  return new Intl.NumberFormat(locale, { style: 'unit', unit: SIZE_UNITS[unit], unitDisplay: 'short', maximumFractionDigits: digits(value) }).format(value)
}
