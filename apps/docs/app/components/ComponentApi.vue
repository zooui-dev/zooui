<script setup lang="ts">
/**
 * A component's API — props, emits and slots — generated at build time from the component's own TypeScript types and
 * JSDoc by nuxt-component-meta (nuxt.config.ts `componentMeta`), never written by hand. Vue's built-in props (`key`,
 * `ref`, `class` …) are left out.
 */
const props = defineProps<{
  /** The registered component name: `ZKicker`. */
  name: string
  /** The Nuxt UI component a wrapper passes everything else through to: `UModal`. */
  wraps?: string
}>()

interface Prop { name: string, type: string, required: boolean, default?: string, description?: string, global?: boolean }
interface Event { name: string, type: string, description?: string }
interface Slot { name: string, type: string, description?: string }
interface Meta { meta: { props: Prop[], events: Event[], slots: Slot[] } }

const meta = await useComponentMeta(props.name as never) as unknown as ComputedRef<Meta | undefined>
if (!meta.value?.meta) {
  throw createError({ statusCode: 500, statusMessage: `No component metadata for ${props.name}: is it a Z* component of @zooui/nuxt?`, fatal: true })
}

const propRows = computed(() => (meta.value?.meta.props ?? []).filter((p) => !p.global)
  .map((p) => ({ ...p, type: p.type.replace(/ \| undefined$/, '') }))
  .sort((a, b) => Number(b.required) - Number(a.required) || a.name.localeCompare(b.name)))
const eventRows = computed(() => meta.value?.meta.events ?? [])
const slotRows = computed(() => meta.value?.meta.slots ?? [])

/** Nuxt UI's docs path for a wrapped component: `UModal` → modal. */
const wrapsDoc = computed(() => props.wraps
  ? `https://ui.nuxt.com/docs/components/${props.wraps.replace(/^U/, '').replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase()}`
  : undefined)

const propColumns = [
  { accessorKey: 'name', header: 'Prop' },
  { accessorKey: 'type', header: 'Type' },
  { accessorKey: 'default', header: 'Default' },
  { accessorKey: 'description', header: 'Description' },
]
const eventColumns = [
  { accessorKey: 'name', header: 'Event' },
  { accessorKey: 'type', header: 'Payload' },
  { accessorKey: 'description', header: 'Description' },
]
const slotColumns = [
  { accessorKey: 'name', header: 'Slot' },
  { accessorKey: 'description', header: 'Description' },
]
</script>

<template>
  <section class="mt-12 flex flex-col gap-8" :data-api="name">
    <h2 id="api" class="text-2xl font-semibold text-highlighted scroll-mt-(--ui-header-height)">
      <a href="#api" class="hover:underline underline-offset-4">API</a>
    </h2>

    <UAlert
      v-if="wraps" color="info" variant="outline" icon="i-lucide-layers" :title="`Everything else is ${wraps}'s`"
    >
      <template #description>
        Only the props below are {{ name }}'s own. Every other prop, <code>v-model</code>, event and slot passes straight
        through to Nuxt UI's <ULink :to="wrapsDoc" target="_blank" class="underline">{{ wraps }}</ULink>.
      </template>
    </UAlert>

    <div class="flex flex-col gap-3">
      <h3 class="text-lg font-semibold text-highlighted">Props</h3>
      <UTable v-if="propRows.length" :data="propRows" :columns="propColumns" data-api-table="props" class="ring ring-default rounded-md">
        <template #name-cell="{ row }">
          <span class="flex items-center gap-1.5 whitespace-nowrap">
            <ZIdentifier data-prop>{{ row.original.name }}</ZIdentifier>
            <UBadge v-if="row.original.required" color="warning" variant="subtle" size="sm">required</UBadge>
          </span>
        </template>
        <template #type-cell="{ row }"><code class="font-mono text-xs text-toned whitespace-pre-wrap">{{ row.original.type }}</code></template>
        <template #default-cell="{ row }"><code v-if="row.original.default" class="font-mono text-xs">{{ row.original.default }}</code><span v-else class="text-dimmed">—</span></template>
        <template #description-cell="{ row }"><span class="text-sm text-muted whitespace-normal">{{ row.original.description || '—' }}</span></template>
      </UTable>
      <p v-else class="text-sm text-muted" data-api-empty="props">No props.</p>
    </div>

    <div v-if="eventRows.length" class="flex flex-col gap-3">
      <h3 class="text-lg font-semibold text-highlighted">Emits</h3>
      <UTable :data="eventRows" :columns="eventColumns" data-api-table="emits" class="ring ring-default rounded-md">
        <template #name-cell="{ row }"><ZIdentifier data-event>{{ row.original.name }}</ZIdentifier></template>
        <template #type-cell="{ row }"><code class="font-mono text-xs text-toned whitespace-pre-wrap">{{ row.original.type }}</code></template>
        <template #description-cell="{ row }"><span class="text-sm text-muted whitespace-normal">{{ row.original.description || '—' }}</span></template>
      </UTable>
    </div>

    <div v-if="slotRows.length" class="flex flex-col gap-3">
      <h3 class="text-lg font-semibold text-highlighted">Slots</h3>
      <UTable :data="slotRows" :columns="slotColumns" data-api-table="slots" class="ring ring-default rounded-md">
        <template #name-cell="{ row }"><ZIdentifier data-slot>{{ row.original.name }}</ZIdentifier></template>
        <template #description-cell="{ row }"><span class="text-sm text-muted whitespace-normal">{{ row.original.description || '—' }}</span></template>
      </UTable>
    </div>
  </section>
</template>
