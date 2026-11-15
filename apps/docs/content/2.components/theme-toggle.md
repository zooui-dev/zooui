---
title: Theme toggle
description: Light, dark or system as one segmented control, over Nuxt's color mode.
component: ZThemeToggle
preview: ThemeToggleBasic
---

Three Nuxt UI buttons in a field group, the chosen one pressed. The preference is only known in the browser, so on the server a disabled copy stands in rather than a guess. It is the same toggle as in this site's header.

::component-example{name="ThemeToggleBasic"}
::

## `useZooTheme()`

The toggle is a view over `useZooTheme()`, which you can use for a control of your own. `theme` is the preference (`light`, `dark` or `system`), writable, and `setTheme` changes it too. `ZOO_THEMES` lists the three.

::component-example{name="ThemeToggleComposable"}
::
