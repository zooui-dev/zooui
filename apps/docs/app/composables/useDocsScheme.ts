/**
 * The Forest scheme the reader is looking at. Every scheme's CSS ships scoped to `:root[data-scheme="<id>"]`
 * (nuxt.config.ts), so a scheme is one attribute on <html>, set before first paint by the head script from
 * localStorage. Prerendered pages cannot know the reader's choice, so the state starts at the default on the server
 * and in hydration and takes the stored choice once mounted: nothing the server rendered disagrees with the client.
 */
import { DEFAULT_SCHEME, SCHEMES, SCHEME_STORAGE_KEY, type SchemeId } from '~~/shared/schemes'
import { SWATCHES } from '#build/zoo-schemes.mjs'

export function useDocsScheme() {
  const id = useState<SchemeId>('docs-scheme', () => DEFAULT_SCHEME)

  onMounted(() => {
    const stored = document.documentElement.dataset.scheme
    if (stored && SCHEMES.some((s) => s.id === stored)) id.value = stored as SchemeId
  })

  function setScheme(next: SchemeId) {
    id.value = next
    const root = document.documentElement
    if (next === DEFAULT_SCHEME) delete root.dataset.scheme
    else root.dataset.scheme = next
    try { localStorage.setItem(SCHEME_STORAGE_KEY, next) } catch { /* storage refused (private mode): the choice lasts for this page */ }
  }

  const schemes = SCHEMES.map((s) => ({ ...s, swatch: (SWATCHES as Record<string, string>)[s.id] ?? 'currentColor' }))
  const scheme = computed(() => schemes.find((s) => s.id === id.value) ?? schemes[0]!)

  return { id: readonly(id), scheme, schemes, setScheme }
}
