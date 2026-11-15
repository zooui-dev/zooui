<script setup lang="ts">
// The 404 (prerendered to 404.html, which Netlify serves for any path it has no file for) and any other error.
import type { NuxtError } from '#app'

const props = defineProps<{ error: NuxtError }>()

useSeoMeta({ title: props.error.statusCode === 404 ? 'Page not found' : 'Something went wrong' })
</script>

<template>
  <UApp>
    <UHeader to="/">
      <template #title><AppLogo /></template>
      <template #right><ZThemeToggle /></template>
    </UHeader>
    <UMain>
      <UContainer>
        <UError
          :error="{
            statusCode: error.statusCode,
            statusMessage: error.statusCode === 404 ? 'Page not found' : error.statusMessage,
            message: error.statusCode === 404 ? 'There is no page at this address. Try the guide or the components.' : error.message,
          }"
          :clear="{ label: 'Back to the home page' }"
          redirect="/"
          data-error-page
        />
      </UContainer>
    </UMain>
  </UApp>
</template>
