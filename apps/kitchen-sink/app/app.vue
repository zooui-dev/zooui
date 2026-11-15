<script setup lang="ts">
useHead({ title: 'Nuxt UI kitchen sink' })

// Nuxt UI installs @nuxtjs/color-mode; the baseline has to be judged in both themes.
const mode = useColorMode()
const isDark = computed({
  get: () => mode.value === 'dark',
  set: (v) => { mode.preference = v ? 'dark' : 'light' },
})

const sections = [
  { id: 'buttons', label: 'Buttons' },
  { id: 'form', label: 'Form' },
  { id: 'data', label: 'Data' },
  { id: 'navigation', label: 'Navigation' },
  { id: 'overlays', label: 'Overlays' },
  { id: 'feedback', label: 'Feedback' },
]
</script>

<template>
  <UApp>
    <div class="min-h-screen bg-default text-default">
      <header class="sticky top-0 z-10 border-b border-default bg-default/80 backdrop-blur">
        <div class="mx-auto max-w-5xl px-4 py-3 flex items-center gap-4 flex-wrap">
          <div class="flex flex-col">
            <h1 class="text-lg font-semibold">Nuxt UI kitchen sink</h1>
            <p class="text-xs text-muted">Default theme — no theme, no overrides. The baseline for Zoo UI.</p>
          </div>
          <nav class="ml-auto flex items-center gap-1 flex-wrap">
            <UButton v-for="s in sections" :key="s.id" :to="`#${s.id}`" color="neutral" variant="ghost" size="sm">{{ s.label }}</UButton>
            <USwitch v-model="isDark" unchecked-icon="i-lucide-sun" checked-icon="i-lucide-moon" aria-label="Dark mode" />
          </nav>
        </div>
      </header>

      <NuxtPage />
    </div>
  </UApp>
</template>
