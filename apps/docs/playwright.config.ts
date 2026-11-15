import { defineConfig, devices } from '@playwright/test'

// Runs against the GENERATED site (.output/public), served as Netlify will serve it. `pnpm generate` first: this config
// does not build.
const PORT = 3205

export default defineConfig({
  testDir: './tests',
  timeout: 15_000,
  fullyParallel: true,
  reporter: [['list']],
  use: { baseURL: `http://localhost:${PORT}`, ...devices['Desktop Chrome'] },
  webServer: {
    command: 'node tests/serve.mjs',
    port: PORT,
    env: { PORT: String(PORT) },
    reuseExistingServer: false,
    timeout: 10_000,
  },
})
