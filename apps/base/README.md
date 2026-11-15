# Zoo UI base app

`@zooui/nuxt` alone, as a product with a look of its own uses it. The app is a product with a look of its own: its own palette in
`app.config.ts`, its own typefaces, color-mode key, CSS tokens and `data-accent` hue map, and no Forest theme.

```bash
pnpm install          # at the repository root
pnpm base:dev         # → http://localhost:3004
pnpm base:build && pnpm base:test
```

The tests run against the production build. They check that none of Forest's look arrives, and that every `Z*`
component paints in the product's colors in both modes. The full list is in `packages/nuxt/README.md`, "The tests".
