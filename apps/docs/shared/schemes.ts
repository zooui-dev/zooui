/** Forest's schemes, in the order the theme's README lists them; `id` is the file name under
 *  `@zooui/theme-forest/schemes/`. Read by nuxt.config.ts (to scope each file's CSS) and by the switcher. */
export const SCHEMES = [
  { id: 'teal', name: 'Pine · Teal' },
  { id: 'slate-cobalt', name: 'Slate · Cobalt' },
  { id: 'graphite-violet', name: 'Graphite · Violet' },
  { id: 'paper-olive', name: 'Paper · Olive' },
  { id: 'ink-indigo', name: 'Ink · Indigo' },
  { id: 'ember', name: 'Ember · Amber' },
] as const

export type SchemeId = (typeof SCHEMES)[number]['id']

export const DEFAULT_SCHEME: SchemeId = 'teal'

/** Where the reader's choice is kept; the pre-paint script in nuxt.config.ts reads the same key. */
export const SCHEME_STORAGE_KEY = 'zooui-docs-scheme'
