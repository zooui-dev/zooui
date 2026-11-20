---
type: feat
"@zooui/nuxt"
---

New `ZOptionalDate`: a checkbox in front of a `ZDateField`, for a day a record may or may not have ("Has an end date", "Extension filed"). While the box is off the model is `null` and the field is disabled; the day it held is remembered and comes back when the box is ticked again, and a tick moves focus into the date. `v-model:enabled` binds the box. In a `UFormField` the label, help and error belong to the date input, and every `ZDateField` model type, limit prop and event passes through.