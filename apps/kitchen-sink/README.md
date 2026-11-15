# Kitchen sink — Nuxt UI as it ships

The baseline for **Zoo UI** (`@zooui/nuxt`, and its Forest theme `@zooui/theme-forest`). Zoo UI starts from
Nuxt UI's defaults, adds a theme's colors and typefaces on top, and changes nothing else until there is a reason.

This app is the "before" picture, so every Zoo UI decision can be judged against it. `apps/forest` renders the same
specimens on the Forest theme.

```bash
pnpm install          # at the repository root
pnpm ks:dev           # → http://localhost:3003
pnpm ks:build && pnpm ks:test
```

## Deliberately untouched

| | |
| --- | --- |
| `nuxt.config.ts` | `modules: ['@nuxt/ui']` only. It does **not** extend `@zooui/nuxt`. |
| `app/assets/css/main.css` | `@import "tailwindcss"; @import "@nuxt/ui";` — Nuxt UI's own entry, nothing else. |
| `app/app.config.ts` | Empty. One `ui` key here and this stops being a baseline. |

A test asserts the default theme is still in force (primary is Tailwind's `green-500`), so the page cannot
quietly drift into being themed.

## What's on the page

Six sections, each a `Ks*` component: **Buttons** (the color × variant matrix, sizes, states, groups),
**Form** (every input, plus a real `UForm` showing label / help / error), **Data** (badges, avatars, progress,
skeleton, table, card, accordion, collapsible, timeline, empty), **Navigation** (tabs, breadcrumb, menus,
stepper, pagination), **Overlays** (modal, slideover, drawer, command palette, dropdown, context menu,
popover, tooltip) and **Feedback** (alerts, toasts). The header switches light/dark, because the baseline has
to hold up in both.

The tests cover more than rendering: focus trap and focus return on the modal, roving focus in the dropdown,
form validation, toasts, dark mode, and a guard that no specimen collapses to zero width.
