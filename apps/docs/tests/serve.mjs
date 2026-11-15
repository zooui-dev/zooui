// Serves the generated site (.output/public) the way Netlify will: `/a/b` is `/a/b/index.html` or `/a/b.html`, and any
// path with no file gets 404.html with a 404 status. For the Playwright suite and `pnpm preview`; `nuxi generate` first.
import { createReadStream, statSync } from 'node:fs'
import { createServer } from 'node:http'
import { extname, isAbsolute, join, normalize, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('../.output/public', import.meta.url))
const port = Number(process.env.PORT ?? 3005)

const TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css',
  '.json': 'application/json', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.woff': 'font/woff', '.png': 'image/png',
  '.ico': 'image/x-icon', '.txt': 'text/plain; charset=utf-8', '.wasm': 'application/wasm', '.xml': 'application/xml',
}

const isFile = (path) => { try { return statSync(path).isFile() } catch { return false } }

/** The file a request path maps to, or undefined. Anything resolving outside the root (an encoded `..` included) is refused. */
function resolve(pathname) {
  const base = normalize(join(root, decodeURIComponent(pathname)))
  const inside = relative(root, base)
  if (inside.startsWith('..') || isAbsolute(inside)) return undefined
  return [base, join(base, 'index.html'), `${base}.html`].find(isFile)
}

createServer((req, res) => {
  const { pathname } = new URL(req.url ?? '/', 'http://localhost')
  const file = resolve(pathname)
  const [status, path] = file ? [200, file] : [404, join(root, '404.html')]
  res.writeHead(status, { 'content-type': TYPES[extname(path)] ?? 'application/octet-stream' })
  createReadStream(path).pipe(res)
}).listen(port, () => console.log(`docs: serving ${root} on http://localhost:${port}`))
