---
type: feat
"@zooui/nuxt"
---

useConfirm() asks a question and awaits the answer: confirm() resolves true or false, choose() resolves to the picked action's value or null, and confirmDelete() and confirmDiscard() are ready-made presets. The questions render in ZConfirmDialog, which you mount once inside <UApp>. It's announced as an alertdialog, and Escape, the close button and a click outside all count as a cancel. On a destructive question, focus starts on Cancel. A question asked while another is open waits its turn, and dismissAll() clears the line. Each Nuxt app keeps its own queue, so nothing is shared between server requests, and on the server a call resolves at once as a cancel. ZConfirmButton is a UButton that asks "Are you sure?" in a popover and emits confirm only on yes, and cancel otherwise. Every UButton prop passes through, and the question and button labels are props.