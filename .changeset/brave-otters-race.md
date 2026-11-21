---
type: feat
"@zooui/nuxt"
---

Add `ZHighlight`, which shows text with each match of a search marked, for search results and menu options.

- `text` and `query`: the search is literal and ignores case, so `(` or `.` find themselves.
- Text is never treated as HTML, so a name holding a tag shows as typed.
- `ui.mark` restyles the marks.
- Use it in `UInputMenu` or `USelectMenu` slots with `description-key` for a name-over-email option.