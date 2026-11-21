// The product's app.config on Forest (the theme's own is in packages/theme-forest/app.config.ts; the two are merged).
export default defineAppConfig({
  zooui: {
    // The product's backend puts its message in `fault.reason`: errorMessage() reads it before the shapes it knows.
    errorMessage: { extract: (err: unknown) => (err as { data?: { fault?: { reason?: string } } })?.data?.fault?.reason },
    // The product's own statuses, for every ZStatus and status select (pages/status.vue).
    status: {
      states: {
        draft: { label: 'Draft', icon: 'i-lucide-pencil-line', color: 'neutral' },
        review: { label: 'In review', icon: 'i-lucide-eye', color: 'info' },
        scheduled: { label: 'Scheduled', icon: 'i-lucide-calendar-clock', color: 'warning' },
        shipped: { label: 'Shipped', icon: 'i-lucide-rocket', color: 'success' },
        archived: { label: 'Archived', color: 'neutral' },
      },
    },
  },
})
