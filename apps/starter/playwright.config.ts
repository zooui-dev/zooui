import { defineConfig, devices } from '@playwright/test'

// Runs against the PRODUCTION build (.output). `pnpm build` first — this config does not build.
const PORT = 3202

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
