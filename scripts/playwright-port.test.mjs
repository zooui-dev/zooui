// Two Playwright runs of one app at once (two lanes, two worktrees) must not share a port: with a fixed one, the second
// died with "http://localhost:3204 is already used". Each app's real playwright.config.ts is loaded in its own process,
// as each run's runner loads it, and the two have to land on different ports.
// Run: node --test 'scripts/*.test.mjs'
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { readdirSync, existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { playwrightPort } from './playwright-port.mjs'

const apps = fileURLToPath(new URL('../apps/', import.meta.url))
const configs = readdirSync(apps).filter((app) => existsSync(`${apps}${app}/playwright.config.ts`))

/** What a runner reads from the app's config: the port its webServer waits on, the baseURL, and the env the server gets. */
function load(app, env = {}) {
  const read = `const { default: c } = await import(${JSON.stringify(`${apps}${app}/playwright.config.ts`)})
    process.stdout.write(JSON.stringify({ port: c.webServer.port, baseURL: c.use.baseURL, env: c.webServer.env }))`
  const inherited = { ...process.env }
  delete inherited.PLAYWRIGHT_PORT
  return JSON.parse(execFileSync(process.execPath, ['--input-type=module', '-e', read], { encoding: 'utf8', env: { ...inherited, ...env } }))
}

test('every app has a Playwright config to check', () => {
  assert.deepEqual(configs.sort(), ['base', 'docs', 'forest', 'kitchen-sink', 'starter'])
})

for (const app of configs) {
  test(`${app}: two runs at once get different ports`, () => {
    const [a, b] = [load(app), load(app)]
    assert.notEqual(a.port, b.port)
    for (const run of [a, b]) {
      assert.equal(run.baseURL, `http://localhost:${run.port}`)
      assert.equal(run.env.PORT, String(run.port))
    }
  })

  test(`${app}: a worker reads the port its runner chose`, () => {
    const run = load(app, { PLAYWRIGHT_PORT: '45123' })
    assert.equal(run.port, 45123)
    assert.equal(run.baseURL, 'http://localhost:45123')
  })
}

test('PLAYWRIGHT_PORT that is not a port is refused rather than served on', () => {
  const saved = process.env.PLAYWRIGHT_PORT
  try {
    process.env.PLAYWRIGHT_PORT = '3204x'
    assert.throws(playwrightPort, /not a port/)
  } finally {
    if (saved === undefined) delete process.env.PLAYWRIGHT_PORT
    else process.env.PLAYWRIGHT_PORT = saved
  }
})
