<script setup lang="ts">
/**
 * ZSearchInput in each configuration tests/search-input.spec.ts drives: a v-model filtering a list, with every
 * update and filter event logged; a longer debounce and its own placeholder; the model set from the parent; `filter`
 * alone, with no v-model; sizes; disabled and read-only; `ui` merged; the exposed focus() from a button and the `/`
 * shortcut; and the field in a modal, where Escape clears before it closes.
 */
const PROJECTS = ['Website redesign', 'Mobile app', 'Spring campaign', 'Warehouse move', 'Design system', 'Support portal']
const match = (q: string | null) => PROJECTS.filter((p) => p.toLowerCase().includes((q ?? '').toLowerCase()))

const query = ref<string | null>(null)
const updates = ref<string[]>([])
const filters = ref<string[]>([])

const slow = ref('')
const slowUpdates = ref<string[]>([])

const fromParent = ref('mobile')
const fromParentUpdates = ref<string[]>([])

const filterOnly = ref<string[]>([])
const filterOnlyShown = computed(() => match(filterOnly.value.at(-1) ?? ''))

const small = ref('')
const large = ref('')
const locked = ref('archived')
const readOnly = ref('archived')
const rounded = ref('')

const focusable = useTemplateRef<{ focus: () => void }>('focusable')
const focused = ref('')
defineShortcuts({ '/': () => focusable.value?.focus() })

const modalOpen = ref(false)
const inModal = ref('')
</script>

<template>
  <main class="mx-auto flex max-w-4xl flex-col gap-8 px-4 py-8">
    <header class="flex flex-col gap-2">
      <h1 class="text-2xl font-semibold">ZSearchInput</h1>
      <p class="text-muted">
        A search box for a list or a table toolbar. What is typed is handed back once typing pauses (300 ms by
        default), as the v-model and a <code>filter</code> event together; the clear button and Escape empty it at
        once and keep focus in the field. Each section shows what the parent holds: "model" is the v-model, and the
        lists are the events the component emitted, oldest first. The text box at the bottom is somewhere to Tab or
        click to.
      </p>
    </header>

    <section data-section="basic" class="flex flex-col gap-2">
      <h2 class="text-lg font-semibold">A list filtered by the v-model</h2>
      <p class="text-sm text-muted">Try this: type "des" quickly. Nothing is handed back until you pause, then once. Click the X or press Escape: the field empties at once and keeps focus.</p>
      <UFormField label="Projects">
        <ZSearchInput
          v-model="query"
          placeholder="Filter projects…"
          @update:model-value="(v) => updates.push(JSON.stringify(v))"
          @filter="(v) => filters.push(JSON.stringify(v))"
        />
      </UFormField>
      <p class="text-sm">model: <span data-testid="basic-model">{{ JSON.stringify(query) }}</span></p>
      <p class="text-sm">update:modelValue events: <span data-testid="basic-updates">{{ updates.join(' ') }}</span></p>
      <p class="text-sm">filter events: <span data-testid="basic-filters">{{ filters.join(' ') }}</span></p>
      <p class="text-sm">Matching projects:</p>
      <ul data-testid="basic-list" class="text-sm">
        <li v-for="p in match(query)" :key="p">{{ p }}</li>
      </ul>
    </section>

    <section data-section="slow" class="flex flex-col gap-2">
      <h2 class="text-lg font-semibold">A longer debounce</h2>
      <p class="text-sm text-muted">Try this: type a word. With <code>:debounce="1000"</code> the model follows a full second after the last key.</p>
      <UFormField label="Team members">
        <ZSearchInput v-model="slow" :debounce="1000" placeholder="Find a member…" @update:model-value="(v) => slowUpdates.push(JSON.stringify(v))" />
      </UFormField>
      <p class="text-sm">model: <span data-testid="slow-model">{{ JSON.stringify(slow) }}</span></p>
      <p class="text-sm">update:modelValue events: <span data-testid="slow-updates">{{ slowUpdates.join(' ') }}</span></p>
    </section>

    <section data-section="parent" class="flex flex-col gap-2">
      <h2 class="text-lg font-semibold">The model set from the parent</h2>
      <p class="text-sm text-muted">Try this: the field starts with "mobile" and hands nothing back. The buttons set the model; the field shows it and emits nothing.</p>
      <UFormField label="Saved search">
        <ZSearchInput v-model="fromParent" @update:model-value="(v) => fromParentUpdates.push(JSON.stringify(v))" />
      </UFormField>
      <p class="text-sm">model: <span data-testid="parent-model">{{ JSON.stringify(fromParent) }}</span></p>
      <p class="text-sm">update:modelValue events: <span data-testid="parent-updates">{{ fromParentUpdates.join(' ') }}</span></p>
      <div class="flex gap-2">
        <UButton data-action="set-design" label="Set &quot;design&quot;" size="sm" color="neutral" variant="outline" @click="fromParent = 'design'" />
        <UButton data-action="set-empty" label="Empty it" size="sm" color="neutral" variant="outline" @click="fromParent = ''" />
      </div>
    </section>

    <section data-section="filter-only" class="flex flex-col gap-2">
      <h2 class="text-lg font-semibold">The filter event alone</h2>
      <p class="text-sm text-muted">Try this: type, pause, then clear. With no v-model the page listens to <code>@filter</code> only, and still hears the clear.</p>
      <UFormField label="Projects, by the filter event">
        <ZSearchInput @filter="(v) => filterOnly.push(v)" />
      </UFormField>
      <p class="text-sm">filter events: <span data-testid="filter-only-events">{{ filterOnly.map((v) => JSON.stringify(v)).join(' ') }}</span></p>
      <p class="text-sm">Matching projects: <span data-testid="filter-only-count">{{ filterOnlyShown.length }}</span></p>
    </section>

    <section data-section="sizes" class="flex flex-col gap-2">
      <h2 class="text-lg font-semibold">Size</h2>
      <p class="text-sm text-muted">Try this: type in each. The icons and the clear button follow the size, from the prop (xs) or a UFormField (xl).</p>
      <ZSearchInput v-model="small" size="xs" aria-label="Small search" data-size="xs" />
      <UFormField label="Large search" size="xl">
        <ZSearchInput v-model="large" data-size="xl" />
      </UFormField>
    </section>

    <section data-section="disabled" class="flex flex-col gap-2">
      <h2 class="text-lg font-semibold">Disabled and read-only</h2>
      <p class="text-sm text-muted">Try this: neither takes typing, and neither shows a clear button though both hold text.</p>
      <UFormField label="Disabled search">
        <ZSearchInput v-model="locked" disabled data-state="disabled" />
      </UFormField>
      <UFormField label="Read-only search">
        <ZSearchInput v-model="readOnly" readonly data-state="readonly" />
      </UFormField>
    </section>

    <section data-section="ui" class="flex flex-col gap-2">
      <h2 class="text-lg font-semibold">ui, merged</h2>
      <p class="text-sm text-muted">Try this: the <code>ui</code> prop makes this one round; the clear button still hides while it's empty and shows once you type.</p>
      <UFormField label="Rounded search">
        <ZSearchInput v-model="rounded" :ui="{ base: 'rounded-full', trailing: 'pe-2' }" />
      </UFormField>
    </section>

    <section data-section="focus" class="flex flex-col gap-2">
      <h2 class="text-lg font-semibold">focus()</h2>
      <p class="text-sm text-muted">Try this: click "Focus the search", or press / anywhere outside a text box. Both call the exposed <code>focus()</code>.</p>
      <UFormField label="Quick search">
        <ZSearchInput ref="focusable" v-model="focused" />
      </UFormField>
      <UButton data-action="focus" label="Focus the search" size="sm" color="neutral" variant="outline" class="self-start" @click="focusable?.focus()" />
    </section>

    <section data-section="modal" class="flex flex-col gap-2">
      <h2 class="text-lg font-semibold">In a modal</h2>
      <p class="text-sm text-muted">Try this: open the modal, type, then press Escape twice. The first Escape clears the field; the second closes the modal.</p>
      <UModal v-model:open="modalOpen" title="Pick a project" description="Search the projects">
        <UButton data-action="open-modal" label="Open the modal" size="sm" color="neutral" variant="outline" class="self-start" />
        <template #body>
          <UFormField label="Search in the modal">
            <ZSearchInput v-model="inModal" autofocus />
          </UFormField>
        </template>
      </UModal>
      <p class="text-sm">open: <span data-testid="modal-open">{{ modalOpen }}</span></p>
    </section>

    <UFormField label="Somewhere else">
      <UInput placeholder="Somewhere else" class="max-w-sm" />
    </UFormField>
  </main>
</template>
