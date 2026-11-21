// The product's app.config, over the Forest theme's: its own statuses, for every ZStatus and status select
// (pages/status.vue).
export default defineAppConfig({
  zooui: {
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
