// What the suite knows about the generated site and the layer, read from disk so the tests follow the site as pages
// and components are added: the pages are the HTML files `nuxi generate` wrote, and the components are the layer's
// own .vue files, whose props are read by Vue's compiler (independently of the nuxt-component-meta tables under test).
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { join, relative, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import { compileScript, parse, registerTS, resolveTypeElements } from '@vue/compiler-sfc'

/** The slice of Babel's AST read here (the compiler's own parse, without a dependency on @babel/types). */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Node = { type: string, start?: number | null, end?: number | null, [key: string]: any }
type CallExpression = Node & { type: 'CallExpression', callee: Node, arguments: Node[], typeParameters?: { params: Node[] } }

export const PUBLIC = fileURLToPath(new URL('../.output/public', import.meta.url))
const COMPONENTS = fileURLToPath(new URL('../../../packages/nuxt/components', import.meta.url))

if (!existsSync(join(PUBLIC, 'index.html'))) throw new Error('No generated site in .output/public: run `pnpm generate` first.')

/** Every prerendered page's route, from its index.html: `/`, `/guide/theming`, `/components/kicker` … */
export const ROUTES: string[] = (readdirSync(PUBLIC, { recursive: true, encoding: 'utf8' }) as string[])
  .filter((f) => f === 'index.html' || f.endsWith(`${sep}index.html`))
  .map((f) => `/${f.slice(0, -'index.html'.length).split(sep).join('/')}`.replace(/(.)\/$/, '$1'))
  .sort()

/** The page's generated HTML on disk. */
export const html = (route: string) => readFileSync(join(PUBLIC, route, 'index.html'), 'utf8')

/** Every call to the macro `name` in a `<script setup>` AST, wherever it sits (`const props = withDefaults(defineProps…)`). */
function findCalls(node: unknown, name: string, seen = new WeakSet<object>()): CallExpression[] {
  if (!node || typeof node !== 'object' || seen.has(node)) return []
  seen.add(node)
  const n = node as Node
  if (n.type === 'CallExpression' && n.callee.type === 'Identifier' && n.callee.name === name) return [n as CallExpression]
  return Object.values(n).flatMap((value) => findCalls(value, name, seen))
}

/** The layer's components, as registered (`ZKicker`), with their prop names read from the SFC's `defineProps` by Vue's
 *  own compiler: the members of its type argument (imported and local types resolved) or its runtime object's keys,
 *  plus each `defineModel` (`modelValue`, or the name it is given). */
export const LAYER_COMPONENTS = (() => {
  registerTS(() => createRequire(import.meta.url)('typescript'))
  const fs = { fileExists: existsSync, readFile: (f: string) => (existsSync(f) ? readFileSync(f, 'utf8') : undefined) }
  return readdirSync(COMPONENTS).filter((f) => f.endsWith('.vue')).map((file) => {
    const filename = join(COMPONENTS, file)
    const { descriptor } = parse(readFileSync(filename, 'utf8'), { filename })
    const { scriptSetupAst } = compileScript(descriptor, { id: file, fs })
    const [call] = findCalls(scriptSetupAst, 'defineProps')
    let props: string[] = []
    if (call?.typeParameters?.params[0]) {
      const source = descriptor.scriptSetup!.content
      const ctx = {
        filename, source, options: { fs }, propsDestructuredBindings: {},
        error: (msg: string) => { throw new Error(`${file}: ${msg}`) },
        helper: (key: string) => key, getString: (node: Node) => source.slice(node.start!, node.end!),
      }
      props = Object.keys(resolveTypeElements(ctx as never, call.typeParameters.params[0] as never).props)
    } else if (call?.arguments[0]?.type === 'ObjectExpression') {
      props = (call.arguments[0].properties as Node[]).flatMap((p) => (p.type === 'ObjectProperty' && p.key.type === 'Identifier' ? [p.key.name as string] : []))
    }
    for (const model of findCalls(scriptSetupAst, 'defineModel')) {
      const [first] = model.arguments
      props.push(first?.type === 'StringLiteral' ? first.value as string : 'modelValue')
    }
    return { name: `Z${file.slice(0, -4)}`, file: relative(process.cwd(), filename), props: props.sort() }
  })
})()
