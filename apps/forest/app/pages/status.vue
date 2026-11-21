<script setup lang="ts">
/**
 * ZStatus with a product's own statuses on the Forest theme (tests/status.spec.ts drives it; each behavior in full is in apps/base/tests/status.spec.ts): the five built-ins; the product's map from
 * app.config `zooui.status`; a `states` prop overriding a built-in and an app.config entry; an unknown key falling
 * back; and the map as a select's items from useStatusStates(). The `data-*` attributes are the spec's selectors.
 */
const BUILT_IN = ['healthy', 'warn', 'suspended', 'unreachable', 'quiet'] as const
// `satisfies` holds the typing: app.config's keys are StatusKeys, so <ZStatus state="…"> autocompletes them.
const PRODUCT = ['draft', 'review', 'scheduled', 'shipped', 'archived'] as const satisfies readonly StatusKey[]

const { options, keys, info } = useStatusStates()
const items = computed(() => options(PRODUCT))
const picked = ref<string>('review')
</script>

<template>
  <main class="mx-auto flex max-w-4xl flex-col gap-8 px-4 py-8">
    <header class="flex flex-col gap-2">
      <h1 class="text-2xl font-semibold">ZStatus</h1>
      <p class="text-muted">
        A status as a mark and a label. The five built-in states are drawn by shape; this product adds its own
        (draft, in review, scheduled, shipped, archived) once, in its app.config under <code>zooui.status</code>, and
        every ZStatus and status select reads them. Each readout under a section says what the page resolved.
      </p>
    </header>

    <section class="flex flex-col gap-3">
      <h2 class="text-lg font-semibold">Built-in states</h2>
      <p class="text-sm text-muted">Try this: switch to grayscale or dark mode; each state keeps its own shape.</p>
      <div class="flex flex-wrap items-center gap-4">
        <ZStatus v-for="s in BUILT_IN" :key="s" :state="s" :data-status="s" />
      </div>
    </section>

    <section class="flex flex-col gap-3">
      <h2 class="text-lg font-semibold">The product's statuses, from app.config</h2>
      <p class="text-sm text-muted">Try this: compare the plain and pill rows; "Archived" has no icon, so it is a dot in its color.</p>
      <div class="flex flex-wrap items-center gap-4">
        <ZStatus v-for="s in PRODUCT" :key="s" :state="s" :data-product-status="s" />
      </div>
      <div class="flex flex-wrap items-center gap-2">
        <ZStatus v-for="s in PRODUCT" :key="s" :state="s" pill :data-product-pill="s" />
      </div>
      <p class="text-sm">
        <span class="text-muted">Every key, in map order:</span> <span data-keys>{{ keys.join(', ') }}</span>
      </p>
    </section>

    <section class="flex flex-col gap-3">
      <h2 class="text-lg font-semibold">Overrides with the <code>states</code> prop</h2>
      <p class="text-sm text-muted">
        Try this: the first keeps the built-in triangle with a new label; the second renames an app.config status for
        this one use; the third gives a built-in an icon of its own.
      </p>
      <div class="flex flex-wrap items-center gap-4">
        <ZStatus state="warn" :states="{ warn: { label: 'Almost full' } }" data-override="warn" />
        <ZStatus state="shipped" :states="{ shipped: { label: 'Live' } }" data-override="shipped" />
        <ZStatus state="quiet" :states="{ quiet: { icon: 'i-lucide-moon', label: 'Paused' } }" data-override="quiet" />
      </div>
    </section>

    <section class="flex flex-col gap-3">
      <h2 class="text-lg font-semibold">An unknown key</h2>
      <p class="text-sm text-muted">
        Try this: a key the map lacks shows "Unknown" with a help icon; the second passes the product's own text in the
        default slot.
      </p>
      <div class="flex flex-wrap items-center gap-4">
        <ZStatus state="retired" data-unknown="plain" />
        <ZStatus state="retired" data-unknown="slot">Retired</ZStatus>
      </div>
    </section>

    <section class="flex flex-col gap-3">
      <h2 class="text-lg font-semibold">The map as a select</h2>
      <p class="text-sm text-muted">Try this: pick a status; the items come from <code>useStatusStates().options()</code>, in the map's order.</p>
      <div class="flex flex-wrap items-end gap-4">
        <UFormField label="Status" name="status">
          <USelectMenu v-model="picked" :items="items" value-key="value" class="w-48" data-select />
        </UFormField>
        <p class="text-sm">
          <span class="text-muted">Picked:</span> <ZStatus :state="picked" data-picked /> <span class="text-muted">· known:</span>
          <span data-picked-known>{{ info(picked).known }}</span>
        </p>
      </div>
    </section>
  </main>
</template>
