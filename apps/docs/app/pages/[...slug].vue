<script setup lang="ts">
// Every content page except the home page. A page whose frontmatter names a `component` gets that component's
// generated API table after its prose, so a component page is one markdown file plus its examples.
definePageMeta({ layout: 'docs' })

const route = useRoute()

const { data: page } = await useAsyncData(route.path, () => queryCollection('docs').path(route.path).first())
if (!page.value) throw createError({ statusCode: 404, statusMessage: 'Page not found', fatal: true })

const { data: surround } = await useAsyncData(`${route.path}-surround`, () =>
  queryCollectionItemSurroundings('docs', route.path, { fields: ['description'] }))

useSeoMeta({ title: page.value.title, description: page.value.description })

const toc = computed(() => page.value?.body?.toc?.links ?? [])
const apiLinks = computed(() => page.value?.component ? [{ id: 'api', depth: 2, text: 'API' }] : [])
</script>

<template>
  <UPage v-if="page">
    <UPageHeader :title="page.title" :description="page.description">
      <template v-if="page.component" #headline>
        <ZKicker>component</ZKicker>
      </template>
    </UPageHeader>

    <UPageBody>
      <ContentRenderer :value="page" />
      <ComponentApi v-if="page.component" :name="page.component" :wraps="page.wraps" />
      <USeparator v-if="surround?.length" />
      <UContentSurround :surround="surround ?? []" />
    </UPageBody>

    <template v-if="toc.length || apiLinks.length" #right>
      <UContentToc :links="[...toc, ...apiLinks]" highlight />
    </template>
  </UPage>
</template>
