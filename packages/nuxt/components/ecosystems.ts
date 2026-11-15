/**
 * The ecosystems ZEcosystemMark knows by name — package managers as two-letter monogram tiles. Each has its own
 * corner SHAPE so they read apart at 20px without brand color. A product with ecosystems beyond these passes
 * `label`, `monogram` and `shape` to the component (any of them also overrides an entry here); an unknown ecosystem
 * with none of them is still drawn, from its own name, on the plain `rounded` tile.
 */
export const ECOSYSTEM_SHAPES = ['square', 'circle', 'leaf', 'arch', 'lens', 'drop', 'rounded'] as const
export type EcosystemShape = (typeof ECOSYSTEM_SHAPES)[number]

export interface Ecosystem {
  /** what the tile reads as — the accessible name, and the visible label with `with-label` */
  label: string
  /** two letters, set in the mono face */
  monogram: string
  shape: EcosystemShape
}

export const ECOSYSTEMS = {
  npm: { label: 'npm', monogram: 'npm', shape: 'square' },
  nuget: { label: 'NuGet', monogram: 'nu', shape: 'circle' },
  winget: { label: 'winget', monogram: 'wg', shape: 'leaf' },
  chocolatey: { label: 'Chocolatey', monogram: 'ch', shape: 'arch' },
  scoop: { label: 'Scoop', monogram: 'sc', shape: 'lens' },
  homebrew: { label: 'Homebrew', monogram: 'br', shape: 'drop' },
} as const satisfies Record<string, Ecosystem>

export type KnownEcosystem = keyof typeof ECOSYSTEMS

/** The entry for `id`, with any overrides applied; an unknown id falls back to its own name. */
export function ecosystem(id: string, overrides: Partial<Ecosystem> = {}): Ecosystem {
  const known: Ecosystem | undefined = (ECOSYSTEMS as Record<string, Ecosystem>)[id]
  const base = known ?? { label: id, monogram: id.slice(0, 2), shape: 'rounded' }
  return {
    label: overrides.label ?? base.label,
    monogram: overrides.monogram ?? base.monogram,
    shape: overrides.shape ?? base.shape,
  }
}
