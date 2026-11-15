import { existsSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { expect, test } from '@playwright/test'
import { loadNuxtConfig } from 'nuxt/kit'

// What the base layer itself sets, read from the resolved config of an app that extends it and sets NOTHING. The page
// tests run on a product that names its own color-mode key and palette, which would paint over anything the base
// leaked; here nothing does. The theme layer, loaded the same way, is the control: it shows these reads see a leak.

const layer = fileURLToPath(new URL('../../../packages/nuxt', import.meta.url))
const themeLayer = fileURLToPath(new URL('../../../packages/theme-forest', import.meta.url))

async function resolved(extend: string) {
  const dir = mkdtempSync(join(tmpdir(), 'zooui-config-'))
  try {
    // "type": "module", or newer loaders read the config's default export wrapped and find no `extends` in it
    writeFileSync(join(dir, 'package.json'), '{"type":"module"}')
    writeFileSync(join(dir, 'nuxt.config.ts'), `export default defineNuxtConfig({ extends: [${JSON.stringify(extend)}] })`)
    // `ui` and `colorMode` are module options, not in NuxtOptions' own type
    const config = await loadNuxtConfig({ cwd: dir }) as Awaited<ReturnType<typeof loadNuxtConfig>> & { ui?: object, colorMode?: object }
    const appConfigs = config._layers.slice(1).map((l) => l.cwd)
      .filter((cwd) => ['app.config.ts', 'app/app.config.ts'].some((f) => existsSync(join(cwd, f))))
    return { ui: config.ui, colorMode: config.colorMode, appConfig: config.appConfig, appConfigs }
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
}

test('the base sets no colors, typefaces or color-mode settings, and carries no app.config', async () => {
  const base = await resolved(layer)
  expect(base.ui ?? {}).toEqual({})                    // no ui.colors, no fonts: false
  expect(base.colorMode ?? {}).toEqual({})             // no storageKey (the theme's zooui-color-mode), no dataValue
  expect(base.appConfig?.ui).toBeUndefined()            // (Nuxt's own `appConfig.nuxt` default is always there)
  expect(base.appConfigs).toEqual([])                  // no layer brings an app.config (ui.colors, restyling)

  const theme = await resolved(themeLayer)             // the control: the same reads see the theme's settings
  expect(theme.ui).toEqual({ fonts: false })
  expect(theme.colorMode).toEqual({ storageKey: 'zooui-color-mode' })
  expect(theme.appConfigs).toEqual([themeLayer])
})
