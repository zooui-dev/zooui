<script setup lang="ts">
useHead({ title: 'Zoo UI · Forest — Nuxt UI with the Forest theme' })

const mode = useColorMode()
const isDark = computed({
  get: () => mode.value === 'dark',
  set: (v) => { mode.preference = v ? 'dark' : 'light' },
})

// Forest's accent schemes, switchable live — each repaints every Nuxt UI component through the layer.
const { id: schemeId, scheme, schemes } = useScheme()

const sections = [
  { id: 'buttons', label: 'Buttons' },
  { id: 'form', label: 'Form' },
  { id: 'data', label: 'Data' },
  { id: 'navigation', label: 'Navigation' },
  { id: 'overlays', label: 'Overlays' },
  { id: 'feedback', label: 'Feedback' },
  { id: 'edges', label: 'Edges' },
  { id: 'zoo', label: 'Zoo UI' },
  { id: 'grid', label: 'Grid' },
]
</script>

<template>
  <UApp>
    <div class="min-h-screen text-default">
      <header class="sticky top-0 z-10 border-b border-default bg-default/80 backdrop-blur">
        <div class="mx-auto max-w-5xl px-4 py-3 flex flex-col gap-3">
          <div class="flex items-center gap-4 flex-wrap">
            <div class="flex flex-col">
              <h1 class="text-lg font-semibold">Zoo UI · Forest</h1>
              <p class="text-xs text-muted">Nuxt UI as it ships, with Forest's colors on top. Same specimens as the baseline.</p>
            </div>
            <nav class="ml-auto flex items-center gap-1 flex-wrap">
              <UButton v-for="s in sections" :key="s.id" :to="`#${s.id}`" color="neutral" variant="ghost" size="sm">{{ s.label }}</UButton>
              <USwitch v-model="isDark" unchecked-icon="i-lucide-sun" checked-icon="i-lucide-moon" aria-label="Dark mode" />
            </nav>
          </div>

          <!-- one swatch per scheme, painted with that scheme's own accent-500 -->
          <div class="flex items-center gap-3 flex-wrap">
            <span class="text-xs font-medium uppercase tracking-wide text-dimmed">Scheme</span>
            <div role="group" aria-label="Color scheme" class="flex items-center gap-1.5">
              <UTooltip v-for="s in schemes" :key="s.id" :text="s.name" :delay-duration="0">
                <button
                  type="button"
                  :aria-pressed="s.id === schemeId"
                  :aria-label="s.name"
                  :data-scheme="s.id"
                  class="size-6 rounded-full cursor-pointer ring-offset-2 ring-offset-(--ui-bg) transition-shadow focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary"
                  :class="s.id === schemeId ? 'ring-2 ring-(--ui-text-highlighted)' : 'ring-1 ring-black/10 hover:ring-2 hover:ring-(--ui-border-accented)'"
                  :style="{ backgroundColor: s.swatch }"
                  @click="schemeId = s.id"
                />
              </UTooltip>
            </div>
            <span class="text-sm text-muted">{{ scheme.name }}</span>
          </div>
        </div>
      </header>
      <NuxtPage />
    </div>
  </UApp>
</template>
