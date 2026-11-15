---
title: Token reveal
description: The shown-once moment for a new secret, with copy, a warning and an optional acknowledgment.
component: ZTokenReveal
preview: TokenRevealAck
---

When a product creates an API token it can show it once. `ZTokenReveal` puts the token on Zoo UI's code surface under a `[ token · name · shown once ]` kicker, with a warning banner saying it won't be shown again. The default slot replaces the banner's text.

With `require-ack`, a button acknowledges the token has been saved. The secret then blurs and goes inert, out of reach of focus and screen readers, and `@ack` fires once.

::component-example{name="TokenRevealAck"}
::
