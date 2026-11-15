---
title: Ecosystem mark
description: A package manager as a two-letter mono tile, told apart by corner shape rather than brand color.
component: ZEcosystemMark
preview: EcosystemMarkKnown
---

Package ecosystems are told apart by the **corner shape** of a two-letter tile, not by brand colors, so they read at 20px and in grayscale. Six ecosystems are built in: npm, NuGet, winget, Chocolatey, Scoop and Homebrew. `with-label` shows the name beside the tile, and `disabled` dashes it for "not available yet".

::component-example{name="EcosystemMarkKnown"}
::

## Other ecosystems

Any other ecosystem is drawn from `label`, `monogram` and `shape` (`square`, `circle`, `leaf`, `arch`, `lens`, `drop` or `rounded`). Without them, the name is used.

::component-example{name="EcosystemMarkCustom"}
::
