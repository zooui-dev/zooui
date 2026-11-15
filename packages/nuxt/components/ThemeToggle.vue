<script setup lang="ts">
/**
 * Light / dark / system as one segmented control: Nuxt UI buttons in a field group, the chosen one pressed
 * (aria-pressed) and solid. The preference is only known on the client, so the control renders there and a
 * disabled copy stands in on the server rather than a guess.
 */
import { ZOO_THEMES } from '../composables/useZooTheme'

const { theme, setTheme } = useZooTheme()

const ICONS = { light: 'i-lucide-sun', dark: 'i-lucide-moon', system: 'i-lucide-monitor' } as const
</script>

<template>
  <ClientOnly>
    <UFieldGroup role="group" aria-label="Theme">
      <UButton
        v-for="t in ZOO_THEMES" :key="t"
        :icon="ICONS[t]" :label="t" size="xs" color="neutral"
        :variant="theme === t ? 'solid' : 'outline'" :aria-pressed="theme === t"
        @click="setTheme(t)"
      />
    </UFieldGroup>
    <template #fallback>
      <UFieldGroup role="group" aria-label="Theme">
        <UButton v-for="t in ZOO_THEMES" :key="t" :icon="ICONS[t]" :label="t" size="xs" color="neutral" variant="outline" disabled />
      </UFieldGroup>
    </template>
  </ClientOnly>
</template>
