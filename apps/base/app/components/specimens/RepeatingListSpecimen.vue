<script setup lang="ts">
/**
 * ZRepeatingList in the three shapes a product uses it: a cash-flow split (at least 2 parts, at most 12), referral sources
 * folded to a summary with per-row errors, and compact one-field categories. Typed: `row` in each slot is the list's
 * own row type, and the @vue-expect-error below fails the typecheck if ZRepeatingList's generic were lost.
 */
interface Part { amount: string }
interface Source { id?: string; name: string; company: string }
interface Category { name: string }

const parts = ref<Part[]>([])
const sources = ref<Source[]>([
  { id: 'source 1', name: 'Pat Brown', company: 'Brown Architects' },
  { id: 'source 2', name: 'Sam Lee', company: 'Lee Plumbing' },
  { id: 'source 3', name: 'Dana Cruz', company: '' },
])
const categories = ref<Category[]>([{ name: 'Strategy & Planning' }, { name: 'Sales' }, { name: 'Operations' }])

// Errors by row key, as a form's validation would set them: here, a source with no name. After the first Check it
// validates live, as the user types, so an error clears mid-edit.
const sourceErrors = ref<Record<string, string>>({})
// Keys with a space, as a caller's might be: the error's DOM id must still be one id.
const sourceKey = (s: Source) => s.id
const checked = ref(false)
function check() {
  checked.value = true
  sourceErrors.value = Object.fromEntries(sources.value.filter((s) => s.id && !s.name.trim()).map((s) => [s.id!, 'Enter name.']))
}
watch(sources, () => { if (checked.value) check() }, { deep: true })
</script>

<template>
  <section id="repeating-list" class="flex flex-col gap-8">
    <div data-specimen="repeating-list-parts" class="flex flex-col gap-2">
      <h3 class="text-sm font-semibold text-highlighted">Split into parts</h3>
      <ZRepeatingList
        v-model="parts"
        item-label="part"
        compact
        :min="2"
        :max="12"
        add-label="Add a part"
        :row-title="(_row, i) => `part ${i + 1}`"
        :new-row="() => ({ amount: '' })"
      >
        <template #row="{ row, index }">
          <UInput v-model="row.amount" :aria-label="`Part ${index + 1} amount`" inputmode="decimal" />
          <!-- The generic holds: `row` is a Part, so a field it lacks is a type error. -->
          <template v-if="false">
            <!-- @vue-expect-error notAField is not on Part -->
            {{ row.notAField }}
          </template>
        </template>
      </ZRepeatingList>
    </div>

    <div data-specimen="repeating-list-sources" class="flex flex-col gap-2">
      <h3 class="text-sm font-semibold text-highlighted">Referral sources</h3>
      <ZRepeatingList v-model="sources" item-label="referral source" :new-row="() => ({ name: '', company: '' })" :row-key="sourceKey" :errors="sourceErrors">
        <template #row="{ row, errorId }">
          <UFormField label="Name">
            <UInput v-model="row.name" :aria-describedby="errorId" />
          </UFormField>
          <UFormField label="Company">
            <UInput v-model="row.company" />
          </UFormField>
        </template>
        <template #summary="{ row }">{{ [row.name, row.company].filter(Boolean).join(' · ') }}</template>
      </ZRepeatingList>
      <div>
        <UButton data-check label="Check" color="neutral" variant="outline" @click="check" />
        <UButton data-clear-name label="Clear Dana's name" color="neutral" variant="ghost" @click="sources[2] && (sources[2].name = '')" />
      </div>
    </div>

    <div data-specimen="repeating-list-categories" class="flex flex-col gap-2">
      <h3 class="text-sm font-semibold text-highlighted">Categories</h3>
      <ZRepeatingList
        v-model="categories"
        item-label="category"
        :new-row="() => ({ name: '' })"
        :row-title="(_row, i) => `Category ${i + 1}`"
        :min="1"
        :max="4"
        compact
      >
        <template #row="{ row, index }">
          <UInput v-model="row.name" :aria-label="`Category ${index + 1}`" class="w-full" />
        </template>
      </ZRepeatingList>
    </div>
  </section>
</template>
