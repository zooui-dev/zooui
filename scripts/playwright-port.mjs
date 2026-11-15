// The port an app's Playwright run serves on. A fixed port per app made concurrent runs (two lanes, two worktrees)
// fight over it, the second dying with "http://localhost:3204 is already used". PLAYWRIGHT_PORT picks one by hand;
// otherwise the OS hands out a free one. Not PORT: dev tooling sets that for the app's own dev server.
//
// Playwright evaluates the config in the runner and again in every worker, so the port is chosen once and kept in
// process.env, which the workers inherit: their baseURL then names the port the runner's webServer is on.
import { execFileSync } from 'node:child_process'

/** A port nothing is listening on right now, from the OS. Synchronous, because a Playwright config is. */
export function freePort() {
  const listen = "const s = require('node:net').createServer().listen(0, () => { process.stdout.write(String(s.address().port)); s.close() })"
  return Number(execFileSync(process.execPath, ['-e', listen], { encoding: 'utf8' }))
}

/** This run's port: PLAYWRIGHT_PORT when set (or already chosen by the runner), else a free one, kept for the workers. */
export function playwrightPort() {
  process.env.PLAYWRIGHT_PORT ||= String(freePort())
  const port = Number(process.env.PLAYWRIGHT_PORT)
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error(`PLAYWRIGHT_PORT is not a port: ${process.env.PLAYWRIGHT_PORT}`)
  return port
}
