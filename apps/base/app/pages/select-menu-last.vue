<script setup lang="ts">
/**
 * A ZSelectMenu that is the last field on the page (tests/select-menu.spec.ts): Tab out of it leaves the page, so no
 * field takes the focus and nothing but ZSelectMenu's own close-on-Tab closes the menu.
 */
const fruit = ref('Cherry')
</script>

<template>
  <main class="mx-auto max-w-3xl px-4 py-8">
    <ZSelectMenu v-model="fruit" :items="['Apple', 'Banana', 'Cherry']" :search-input="false" aria-label="Last fruit" data-menu class="w-60" />
  </main>
</template>
