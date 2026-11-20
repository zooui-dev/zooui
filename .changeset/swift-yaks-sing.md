---
type: fix
"@zooui/theme-forest"
---

nu-grid: a grid is now its own stacking context (isolate on its root), so its header cells and sticky group labels no longer paint over a page's sticky header as the page scrolls the grid under it.