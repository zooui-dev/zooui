# Zoo UI Forest app

Builds and browser-tests `@zooui/theme-forest`. It renders the kitchen sink's Nuxt UI specimens
(`../kitchen-sink`) and every `Z*` component on the Forest theme, with a live scheme switcher. Its default scheme is
Ink · Indigo.

```bash
pnpm install          # at the repository root
pnpm forest:dev       # → http://localhost:3001 (also pnpm dev)
pnpm forest:build && pnpm forest:test
```

Compare it with the baseline (`pnpm ks:dev`, :3003). What the tests hold is in `packages/theme-forest/README.md`,
"The tests prove color only".
