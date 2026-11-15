<script setup lang="ts">
// every Forest scheme, scoped to `:root[data-scheme]` (nuxt.config.ts), in the entry CSS so it is there before paint
import '#build/zoo-schemes.css'

useSeoMeta({ titleTemplate: (title) => (title && title !== 'Zoo UI' ? `${title} · Zoo UI` : 'Zoo UI — Nuxt UI, themed') })

// The sidebar, the mobile menu and search all read one navigation tree, rendered into every page's payload.
const { data: navigation } = await useAsyncData('navigation', () => queryCollectionNavigation('docs'))
provide('navigation', navigation)

// Search sections are prerendered once to /api/search.json and fetched the first time search opens, not carried in
// every page's payload.
const { open: searchOpen } = useContentSearch()
const { data: files, execute: loadSearch } = useLazyFetch('/api/search.json', { server: false, immediate: false })
watch(searchOpen, (open) => { if (open && !files.value) loadSearch() })

const links = [
  { label: 'Getting started', to: '/guide/getting-started' },
  { label: 'Theming', to: '/guide/theming' },
  { label: 'Components', to: '/components' },
]
</script>

<template>
  <UApp>
    <UHeader to="/" :ui="{ center: 'hidden lg:flex' }">
      <template #title>
        <AppLogo />
      </template>

      <UNavigationMenu :items="links" variant="link" color="neutral" highlight highlight-color="primary" />

      <template #right>
        <UContentSearchButton :collapsed="true" aria-label="Search the docs" />
        <SchemePicker class="hidden sm:flex" />
        <ZThemeToggle class="hidden sm:flex" />
      </template>

      <template #body>
        <div class="flex flex-col gap-4">
          <div class="flex items-center gap-2 flex-wrap sm:hidden">
            <SchemePicker />
            <ZThemeToggle />
          </div>
          <UContentNavigation :navigation="navigation ?? []" highlight />
        </div>
      </template>
    </UHeader>

    <UMain>
      <NuxtLayout>
        <NuxtPage />
      </NuxtLayout>
    </UMain>

    <UFooter>
      <template #left>
        <p class="text-sm text-muted">Zoo UI · MIT license</p>
      </template>
      <template #right>
        <p class="text-sm text-muted">Built with Zoo UI and the Forest theme.</p>
      </template>
    </UFooter>

    <ClientOnly>
      <LazyUContentSearch :files="files ?? []" :navigation="navigation ?? []" :fuse="{ resultLimit: 30 }" />
    </ClientOnly>
  </UApp>
</template>
