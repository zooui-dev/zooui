// The product's app.config, as far as the base is concerned: its palette, its badge sizes, and a Nuxt UI variant written on
// the product's own tokens (main.css) — so the test app shows app.config and CSS additions meeting.
export default defineAppConfig({
  // The product's own number-input steps: dollars move by $5,000 (Zoo UI's neutral default is 1).
  zooui: {
    numberInput: { steps: { money: 5000 } },
    // Warning toasts stay longer than the rest (Zoo UI's default for every tone is 3000 ms).
    notify: { tones: { warning: { duration: 6000 } } },
    // The product's backend puts its message in `fault.reason`: read it before the shapes Zoo UI knows.
    errorMessage: { extract: (err: unknown) => (err as { data?: { fault?: { reason?: string } } })?.data?.fault?.reason },
  },
  ui: {
    colors: {
      primary: 'sky',
      neutral: 'slate',
      secondary: 'amber',
      success: 'emerald',
      warning: 'amber',
      error: 'red',
    },
    input: {
      variants: {
        variant: {
          outline: 'text-val-input bg-val-input-bg ring ring-inset ring-val-input-line',
        },
      },
    },
    badge: {
      variants: {
        size: {
          xs: { base: 'text-xs px-1.5 py-0.5 gap-1 rounded-sm' },
          sm: { base: 'text-xs px-2 py-0.5 gap-1 rounded-md', leadingIcon: 'size-3.5', trailingIcon: 'size-3.5' },
        },
      },
    },
  },
})
