---
title: Code block
description: Zoo UI's code surface — near-black in both themes — for a command, a config or an inline value, with copy.
component: ZCodeBlock
preview: CodeBlockVariants
---

The code surface stays near-black in both themes, so a command looks like a command wherever it sits. `inline` is a chip in running text; `line` is one command after a `$` prompt; `block` is multi-line, with an optional language label. Every variant but `inline` has a copy button.

::component-example{name="CodeBlockVariants"}
::

## Marking a secret

`token` marks a substring as the secret: highlighted, and selectable in one click. The copy result is announced to screen readers, a refused copy says so, and `@copy` fires only when the text really reached the clipboard.

::component-example{name="CodeBlockToken"}
::
