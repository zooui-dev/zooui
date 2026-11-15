import { defineConfig, devices } from '@playwright/test'
import { playwrightPort } from '../../scripts/playwright-port.mjs'

// Runs against the PRODUCTION build (.output). `pnpm build` first — this config does not build. Production matters
// here: light-dark() and the useId drift only show up in a production build.
// PLAYWRIGHT_PORT, or a free port: a fixed one collides with a concurrent run of this suite.
const PORT = playwrightPort()

export default defineConfig({
  testDir: './tests',
  timeout: 15_000,
  fullyParallel: true,
  reporter: [['list']],
  use: { baseURL: `http://localhost:${PORT}`, ...devices['Desktop Chrome'] },
  webServer: {
    command: 'node .output/server/index.mjs',
    port: PORT,
    env: { PORT: String(PORT), NITRO_PORT: String(PORT) },
    reuseExistingServer: false,
    timeout: 20_000,
  },
})
