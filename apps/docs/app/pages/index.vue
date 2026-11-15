<script setup lang="ts">
// The home page: a hero from content/index.md's frontmatter, then its body (the packages, the quick start, the gallery).
const { data: page } = await useAsyncData('home', () => queryCollection('docs').path('/').first())
if (!page.value) throw createError({ statusCode: 404, statusMessage: 'Page not found', fatal: true })

useSeoMeta({ title: 'Zoo UI', description: page.value.description })
</script>

<template>
  <div v-if="page">
    <UPageHero
      :title="page.title"
      :description="page.description"
      :links="[
        { label: 'Get started', to: '/guide/getting-started', trailingIcon: 'i-lucide-arrow-right' },
        { label: 'Components', to: '/components', color: 'neutral', variant: 'outline' },
      ]"
    >
      <template #headline>
        <ZKicker>nuxt ui · themed</ZKicker>
      </template>
    </UPageHero>

    <UContainer class="pb-16">
      <ContentRenderer :value="page" />
    </UContainer>
  </div>
</template>
