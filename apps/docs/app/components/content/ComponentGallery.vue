<script setup lang="ts">
/**
 * Every component page as a card with a live preview — `::component-gallery` in a page. Built from the pages
 * themselves (any page whose frontmatter names a `component`), so a new component page joins the gallery by existing.
 */
const { data: pages } = await useAsyncData('component-gallery', () => queryCollection('docs')
  .where('component', 'IS NOT NULL')
  .select('path', 'title', 'description', 'component', 'preview')
  .order('title', 'ASC')
  .all())
</script>

<template>
  <div class="not-prose my-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3" data-gallery>
    <ZCard v-for="p in pages" :key="p.path" color="primary" :ui="{ root: 'flex flex-col', body: 'flex-1 flex flex-col gap-3' }" :data-gallery-card="p.component">
      <div class="min-h-24 rounded-md bg-elevated/50 p-4 flex items-center justify-center overflow-hidden">
        <GalleryPreview v-if="p.preview" :name="p.preview" />
        <ZIdentifier v-else kind="plain">&lt;{{ p.component }}&gt;</ZIdentifier>
      </div>
      <div class="flex flex-col gap-1">
        <NuxtLink :to="p.path" class="font-semibold text-highlighted hover:underline underline-offset-4">{{ p.title }}</NuxtLink>
        <p class="text-sm text-muted m-0">{{ p.description }}</p>
      </div>
    </ZCard>
  </div>
</template>
