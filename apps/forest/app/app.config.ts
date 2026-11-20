// The product's app.config on Forest (the theme's own is in packages/theme-forest/app.config.ts; the two are merged).
export default defineAppConfig({
  zooui: {
    // The product's backend puts its message in `fault.reason`: errorMessage() reads it before the shapes it knows.
    errorMessage: { extract: (err: unknown) => (err as { data?: { fault?: { reason?: string } } })?.data?.fault?.reason },
  },
})
