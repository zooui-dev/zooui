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

// Reorderable: steps folded to a summary, with keys, errors and Move to top / bottom; and compact ranked choices with
// a minimum and maximum and no row key (told apart by object identity). Each echoes its order, and the ranked one,
// by which of the starting objects each row is, that a move hands back the same objects.
interface Step { id?: string; name: string }
const steps = ref<Step[]>([{ id: 'step a', name: 'Draft' }, { id: 'step b', name: '' }, { id: 'step c', name: 'Review' }])
const stepErrors = ref<Record<string, string>>({})
const newStep = (): Step => ({ name: '' })
const stepKey = (s: Step) => s.id
const stepTitle = (s: Step, i: number) => s.name || `Step ${i + 1}`
function checkSteps() {
  stepErrors.value = Object.fromEntries(steps.value.filter((s) => s.id && !s.name.trim()).map((s) => [s.id!, 'Name this step.']))
}
const firstChoices: Category[] = [{ name: 'Email' }, { name: 'Phone' }, { name: 'Text' }]
const choices = ref<Category[]>([...firstChoices])
// The ref hands out reactive proxies of the rows: compared as the objects they wrap.
const choiceIdentity = computed(() => choices.value.map((c) => firstChoices.indexOf(toRaw(c))).join(', '))
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

    <div data-specimen="repeating-list-steps" class="flex flex-col gap-2">
      <h3 class="text-sm font-semibold text-highlighted">Steps, in order</h3>
      <ZRepeatingList
        v-model="steps"
        item-label="step"
        reorderable
        move-to-ends
        :new-row="newStep"
        :row-key="stepKey"
        :row-title="stepTitle"
        :errors="stepErrors"
      >
        <template #row="{ row, errorId }">
          <UFormField label="Step name">
            <UInput v-model="row.name" :aria-describedby="errorId" />
          </UFormField>
        </template>
        <template #summary="{ row }">{{ row.name }}</template>
      </ZRepeatingList>
      <div>
        <UButton data-check-steps label="Check steps" color="neutral" variant="outline" @click="checkSteps" />
      </div>
      <p class="text-sm text-muted" data-order>{{ steps.map((s) => s.id ?? 'new').join(', ') }}</p>
    </div>

    <div data-specimen="repeating-list-choices" class="flex flex-col gap-2">
      <h3 class="text-sm font-semibold text-highlighted">Contact preference, best first</h3>
      <ZRepeatingList
        v-model="choices"
        item-label="choice"
        reorderable
        compact
        :min="2"
        :max="4"
        :row-title="(r, i) => r.name || `Choice ${i + 1}`"
        :new-row="() => ({ name: '' })"
        :announce-move="({ title, position }) => `${title} is now choice ${position}.`"
      >
        <template #row="{ row, index }">
          <UInput v-model="row.name" :aria-label="`Choice ${index + 1}`" class="w-full" />
        </template>
      </ZRepeatingList>
      <p class="text-sm text-muted" data-identity>{{ choiceIdentity }}</p>
    </div>
  </section>
</template>
