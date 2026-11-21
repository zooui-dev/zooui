---
type: feat
"@zooui/nuxt"
---

Add `ZUrlInput`, a website address field that tidies what people type and flags addresses that are not real.

- Leaving the field (or pressing Enter) trims the text and puts `https://` in front
- An address without a real host, such as `localhost` or `example`, is kept and the field is marked invalid
- Bind `v-model:error` to the field's `error` to show the message; `invalid-message` changes its wording
- `add-www` adds `www.` to a two-label host; it is off by default
- `isWebAddress()` gives your form rules the same check