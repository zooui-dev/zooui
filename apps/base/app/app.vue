<script setup lang="ts">
useHead({ title: 'Zoo UI base — a product with its own look' })
</script>

<template>
  <UApp>
    <div class="min-h-screen text-default">
      <header class="flex items-center gap-4 border-b border-default px-4 py-3">
        <h1 class="text-lg font-semibold text-brand-navy dark:text-white">Zoo UI base</h1>
        <p class="text-xs text-muted">The theme-free layer, in a product's own palette and typefaces.</p>
        <div class="ml-auto">
          <ZThemeToggle />
        </div>
      </header>
      <NuxtPage />
    </div>
  </UApp>
</template>
