export const THEME_PACKAGE: string
export function packageName(dir: string): string | null
export function isThemeLayer(dir: string): boolean
export function cssImports(source: string): string[]
export function locate(specifier: string, fromDir: string): string | null
export function reaches(file: string, seen?: Set<string>): { base: boolean; theme: boolean }
export function stylesheetMismatch(o: {
  entries: readonly unknown[]
  alias: Record<string, string>
  rootDir: string
  themed: boolean
}): string | null
