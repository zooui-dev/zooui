/**
 * Switch Forest's accent scheme at runtime, for comparing them in this app. A scheme is nothing but raw
 * ramps (--pine-*, --teal-*, and for Ember --amber-*), so switching means re-declaring those and letting Nuxt
 * UI's palettes — which point at them through forest.css — repaint everything.
 *
 * The chosen scheme is injected as a <style> after the base ramps, with `:root:root` so it outranks the
 * stylesheet's own :root regardless of where the tag lands in <head>. Base ramps go first every time: Ember
 * re-declares amber, and switching away from it must put amber back. A cookie (not localStorage) holds the
 * choice so the server renders the right scheme and there is no flash on reload.
 */
import ramps from '@zooui/theme-forest/schemes/ramps.css?raw'
import teal from '@zooui/theme-forest/schemes/teal.css?raw'
import slateCobalt from '@zooui/theme-forest/schemes/slate-cobalt.css?raw'
import graphiteViolet from '@zooui/theme-forest/schemes/graphite-violet.css?raw'
import paperOlive from '@zooui/theme-forest/schemes/paper-olive.css?raw'
import inkIndigo from '@zooui/theme-forest/schemes/ink-indigo.css?raw'
import ember from '@zooui/theme-forest/schemes/ember.css?raw'

export interface Scheme { id: string; name: string; css: string; swatch: string }

/** The swatch is the scheme's own accent-500, read from its file, so it can never disagree with the scheme. */
const swatch = (css: string) => css.match(/--teal-500:\s*(#[0-9a-fA-F]{3,8})/)?.[1] ?? 'currentColor'

// Order and names from the theme README's schemes table.
export const SCHEMES: Scheme[] = [
  { id: 'teal', name: 'Teal', css: teal },
  { id: 'slate-cobalt', name: 'Slate · Cobalt', css: slateCobalt },
  { id: 'graphite-violet', name: 'Graphite · Violet', css: graphiteViolet },
  { id: 'paper-olive', name: 'Paper · Olive', css: paperOlive },
  { id: 'ink-indigo', name: 'Ink · Indigo', css: inkIndigo },
  { id: 'ember', name: 'Ember · Amber', css: ember },
].map((s) => ({ ...s, swatch: swatch(s.css) }))

export function useScheme() {
  // Ink · Indigo by default, as in main.css.
  const id = useCookie<string>('zooui-scheme', { default: () => 'ink-indigo', sameSite: 'lax' })
  const scheme = computed(() => SCHEMES.find((s) => s.id === id.value) ?? SCHEMES.find((s) => s.id === 'ink-indigo')!)

  useHead({
    style: [{
      key: 'zooui-scheme',
      'data-scheme': () => scheme.value.id,
      innerHTML: () => `${ramps}\n${scheme.value.css}`.replaceAll(':root', ':root:root'),
    }],
  })

  return { id, scheme, schemes: SCHEMES }
}
