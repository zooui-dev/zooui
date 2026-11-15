# Zoo UI starter

The smallest Nuxt app on Zoo UI's Forest theme. It exists to show — and test — what a product gets from
`@zooui/theme-forest` alone: **Nuxt UI as it ships, in Forest's colors**, the `Z*` components,
Forest's typefaces (Inter and JetBrains Mono) and the accent schemes. This app lists no `@nuxt/ui` and no Tailwind of its own.

```bash
pnpm install                   # at the repository root (this is a workspace member)
pnpm starter:dev               # → http://localhost:3002
pnpm starter:build && pnpm starter:test
```

## What a product adds — all of it

| File | Why |
| --- | --- |
| `nuxt.config.ts` | `extends: ['@zooui/theme-forest']` (the Forest theme, over the theme-free base `@zooui/nuxt`) and the app's one stylesheet in `css`. Nothing else is required. |
| `app/assets/css/main.css` | The app's one Tailwind entry: `@import "@zooui/theme-forest/assets/css/forest.css"`, then `@import "@zooui/theme-forest/schemes/<scheme>.css"` (this app uses `slate-cobalt`; the schemes are listed in `packages/theme-forest/README.md`). |
| `app/app.vue` | `<UApp>` at the root — Nuxt UI mounts toasts, tooltips and overlays through it. |
| `tests/starter.spec.ts` | What every Forest product checks on every page: `@zooui/nuxt`'s `find-conflicts` guard (hence `@zooui/nuxt` in `devDependencies`), and each element in its face's OpenType set. |

Do **not** add `@nuxt/ui`, `tailwindcss` or `@tailwindcss/vite` to a product: the layer owns them, and a
second Tailwind registration fails the build. Nuxt UI upgrades happen in the layer.

## Using it outside this repository

Not yet: neither layer is on npm. Both are publishable, and neither has been released. Inside this repository the
starter takes both from the workspace (`workspace:*`). Once they are published, copy this folder and change those
specifiers in `package.json` (`@zooui/theme-forest`, and `@zooui/nuxt` for the test helpers) to published versions. The layer
installs INTO the app's tree, so the app and the layer share one Vue and one Nuxt UI.

What the layers add, and which component to reach for: `packages/nuxt/README.md` (the components) and
`packages/theme-forest/README.md` (Forest).
