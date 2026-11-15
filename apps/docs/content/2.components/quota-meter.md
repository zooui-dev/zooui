---
title: Quota meter
description: Usage against a limit, amber from the warning mark, red and hatched over the limit.
component: ZQuotaMeter
preview: QuotaMeterLevels
---

A `meter` for usage against a quota. It turns amber at `warn-at` (80% by default) and red, with Zoo UI's hatch, over the limit, so "over" never relies on color alone.

::component-example{name="QuotaMeterLevels"}
::

## Custom units and labels

`unit` names what is counted, and `format` replaces the label entirely.

::component-example{name="QuotaMeterFormat"}
::
