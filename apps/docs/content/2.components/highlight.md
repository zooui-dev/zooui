---
title: Highlight
description: Text with each match of a search marked, safe for any text a user typed.
component: ZHighlight
preview: HighlightList
---

`ZHighlight` draws a piece of text with each match of a search wrapped in a `<mark>`: a search result's name, or a menu option's label. Give it the `text` and the `query`. The search is literal and ignores case, so `(` or `.` find themselves, and every match is marked. The text is never treated as HTML: a name holding `<b>` or `<img onerror>` shows those characters.

::component-example{name="HighlightList"}
::

## Styling the marks

`ui.mark` takes classes for the marks, merged over the defaults the way Nuxt UI's own `ui` is: `:ui="{ mark: 'bg-transparent text-primary underline' }"` drops the tint for the primary ink. ZHighlight renders no element of its own, so put any other classes on the element that holds it.

## A two-line menu option

For a menu option with a name over an email, use `UInputMenu` or `USelectMenu` with `description-key`, and a ZHighlight in each of the `#item-label` and `#item-description` slots. The menus keep their own icons, check and layout. Filter the items yourself with `ignore-filter` when the search should match the email too, since the menus' own filter looks at labels only.

::component-example{name="HighlightMenu"}
::
