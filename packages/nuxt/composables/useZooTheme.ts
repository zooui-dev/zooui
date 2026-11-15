/**
 * Light, dark or system — a view over @nuxtjs/color-mode (Nuxt UI installs it, and it owns the `dark` class and the
 * pre-paint script), kept so callers and ZThemeToggle have one small API.
 *
 * There is no corner dial: geometry is Nuxt UI's, so a product that wants squarer corners sets Nuxt UI's own
 * `--ui-radius`.
 */
export type ZooTheme = 'light' | 'dark' | 'system'

export const ZOO_THEMES = ['light', 'dark', 'system'] as const satisfies readonly ZooTheme[]

export function useZooTheme() {
  const colorMode = useColorMode()

  const theme = computed<ZooTheme>({
    get: () => colorMode.preference as ZooTheme,
    set: (v) => { colorMode.preference = v },
  })

  function setTheme(v: ZooTheme) {
    theme.value = v
  }

  return { theme, setTheme }
}
