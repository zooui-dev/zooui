import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { addTemplate } from 'nuxt/kit'
import { DEFAULT_SCHEME, SCHEMES, SCHEME_STORAGE_KEY } from './shared/schemes'

// zooui.dev — Zoo UI's documentation, built on Zoo UI: the site extends the Forest theme layer (which extends the base),
// so every page is the framework and its default theme at work. Prose lives in content/ (@nuxt/content); each Z*
// component page is one markdown file plus its examples in app/examples/, and its props/emits/slots table is generated
// from the component itself by nuxt-component-meta. `nuxi generate` prerenders every page to .output/public, for
// Netlify (netlify.toml).
const require = createRequire(import.meta.url)
const schemeFile = (id: string) => readFileSync(require.resolve(`@zooui/theme-forest/schemes/${id}.css`), 'utf8')

export default defineNuxtConfig({
  extends: ['@zooui/theme-forest'],

  modules: [
    // after the layer's @nuxt/ui, as Nuxt UI asks: it then registers its content components (navigation, search, TOC)
    '@nuxt/content',
    'nuxt-component-meta',
    // The scheme switcher's two halves, both built from the scheme files so they can never drift from them:
    //   - zoo-schemes.css: every non-default scheme scoped to `:root[data-scheme="<id>"]`, which outranks forest.css's
    //     default (teal) `:root` — switching is one attribute on <html>, with no reload, cookie or server;
    //   - zoo-schemes.mjs: each scheme's swatch, its own accent-500.
    () => {
      addTemplate({
        filename: 'zoo-schemes.css', write: true,
        getContents: () => SCHEMES.filter((s) => s.id !== DEFAULT_SCHEME)
          .map((s) => schemeFile(s.id).replaceAll(':root', `:root[data-scheme="${s.id}"]`)).join('\n'),
      })
      addTemplate({
        filename: 'zoo-schemes.mjs', write: true,
        getContents: () => `export const SWATCHES = ${JSON.stringify(Object.fromEntries(SCHEMES.map((s) =>
          [s.id, schemeFile(s.id).match(/--teal-500:\s*(#[0-9a-fA-F]{3,8})/)?.[1] ?? 'currentColor'])))}`,
      })
    },
  ],

  // the site's one Tailwind entry: Forest's stylesheet, plus @source for the examples
  css: ['~/assets/css/main.css'],

  compatibilityDate: '2025-06-01',
  devtools: { enabled: false },

  app: {
    head: {
      htmlAttrs: { lang: 'en' },
      link: [{ rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' }],
      // The scheme before first paint: the reader's choice is in localStorage and the scoped rules key off this
      // attribute, so a prerendered page shows the chosen accent with no flash.
      script: [{
        key: 'zooui-scheme',
        innerHTML: `try{var s=localStorage.getItem(${JSON.stringify(SCHEME_STORAGE_KEY)});if(s&&s!==${JSON.stringify(DEFAULT_SCHEME)})document.documentElement.dataset.scheme=s}catch(e){}`,
        tagPosition: 'head',
      }],
    },
  },

  content: {
    // Node's own sqlite (22.5+): nothing native to build at install time
    experimental: { sqliteConnector: 'native' },
    build: {
      markdown: {
        toc: { depth: 3, searchDepth: 3 },
        highlight: { theme: { default: 'github-light', dark: 'github-dark' }, langs: ['vue', 'ts', 'css', 'bash', 'json', 'toml'] },
      },
    },
  },

  // Props, emits and slots for the API tables, read from the Z* components' own types and JSDoc. Only the layer's
  // components: parsing every Nuxt UI component would cost the build time for tables nobody shows.
  componentMeta: {
    exclude: [(component: { pascalName: string, filePath: string }) =>
      !/^Z[A-Z]/.test(component.pascalName) || !/[\\/](?:packages[\\/]nuxt|@zooui[\\/]nuxt)[\\/]components[\\/]/.test(component.filePath)],
    metaFields: { type: false, props: true, slots: true, events: true, exposed: false },
  },

  nitro: {
    prerender: {
      // Every page is reached from `/` through the header, the sidebar and the gallery. A link to a page that does
      // not exist fails the build rather than shipping a broken link.
      crawlLinks: true,
      routes: ['/', '/404.html', '/api/search.json'],
      failOnError: true,
    },
  },
})
