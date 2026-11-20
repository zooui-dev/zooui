<script setup lang="ts">
/**
 * ZOrderList in the shapes a product uses it: a master-detail status editor (the selected status's form beside the
 * list, Add and a confirmed Remove), a long striped list that scrolls, titled by its rows' own text, and a toolbar of
 * the caller's own through #controls. Typed: the @vue-expect-error below fails the typecheck if the generic were lost.
 */
interface Status { id: string; name: string; stage: 'pending' | 'active' | 'done' }
interface Step { id: number; text: string }

const statuses = ref<Status[]>([
  { id: 'open', name: 'Open', stage: 'pending' },
  { id: 'in-progress', name: 'In progress', stage: 'active' },
  { id: 'review', name: 'Review', stage: 'active' },
  { id: 'ready', name: 'Ready', stage: 'active' },
  { id: 'done', name: 'Done', stage: 'done' },
])
const selectedId = ref<string | number | null>(null)
const selected = computed(() => statuses.value.find((s) => s.id === selectedId.value) ?? null)
const reorders = ref<string[]>([])
let added = 0
function addStatus() {
  const status: Status = { id: `new ${++added}`, name: 'New status', stage: 'pending' }
  statuses.value.push(status)
  selectedId.value = status.id
}
function removeStatus(status: Status) {
  statuses.value = statuses.value.filter((s) => s !== status)
}

const steps = ref<Step[]>(Array.from({ length: 30 }, (_, i) => ({ id: i + 1, text: `Step ${i + 1}` })))
const stepId = ref<string | number | null>(null)

const tags = ref([{ key: 'a', label: 'Alpha' }, { key: 'b', label: 'Beta' }, { key: 'c', label: 'Gamma' }])
const tagKey = ref<string | number | null>('b')
</script>

<template>
  <section id="order-list" class="flex flex-col gap-8">
    <div data-specimen="order-list-statuses" class="flex flex-col gap-2">
      <h3 class="text-sm font-semibold text-highlighted">Statuses</h3>
      <div class="grid gap-5 md:grid-cols-2">
        <ZOrderList
          v-model="statuses"
          v-model:selection="selectedId"
          :row-key="(s) => s.id"
          :row-title="(s) => s.name"
          title="Statuses"
          item-label="status"
          allow-remove
          :removable="(s) => s.stage !== 'done'"
          remove-question="Delete this status?"
          remove-description="Tasks in this status keep it until they move."
          @add="addStatus"
          @remove="removeStatus"
          @reorder="({ item, from, to }) => reorders.push(`${item.name} ${from}→${to}`)"
        >
          <template #item="{ item, selected: isSelected }">
            <span :class="isSelected && 'font-medium'">{{ item.name }}</span>
            <!-- The generic holds: `item` is a Status, so a field it lacks is a type error. -->
            <template v-if="false">
              <!-- @vue-expect-error notAField is not on Status -->
              {{ item.notAField }}
            </template>
          </template>
        </ZOrderList>

        <div v-if="selected" class="flex flex-col gap-4 rounded-md border border-default p-4" data-detail>
          <h4 class="text-sm font-semibold text-highlighted">Edit status</h4>
          <UFormField label="Name">
            <UInput v-model="selected.name" data-detail-name />
          </UFormField>
        </div>
        <p v-else class="text-sm text-muted" data-detail-empty>Choose a status to edit it.</p>
      </div>
      <p class="text-xs text-muted">
        Order: <span data-order>{{ statuses.map((s) => s.name).join(', ') }}</span>
        · Selected: <span data-selection>{{ selectedId ?? 'none' }}</span>
        · Reorders: <span data-reorders>{{ reorders.join('; ') }}</span>
      </p>
    </div>

    <div data-specimen="order-list-steps" class="flex max-w-sm flex-col gap-2">
      <h3 class="text-sm font-semibold text-highlighted">Steps</h3>
      <ZOrderList v-model="steps" v-model:selection="stepId" :row-key="(s) => s.id" label="Steps" max-height="10rem" striped :allow-add="false" allow-remove :confirm-remove="false" @remove="(s) => (steps = steps.filter((x) => x !== s))">
        <template #item="{ item }">{{ item.text }}</template>
      </ZOrderList>
    </div>

    <div data-specimen="order-list-custom" class="flex max-w-sm flex-col gap-2">
      <h3 class="text-sm font-semibold text-highlighted">Custom toolbar</h3>
      <ZOrderList v-model="tags" v-model:selection="tagKey" :row-key="(t) => t.key" label="Tags">
        <template #item="{ item }">{{ item.label }}</template>
        <template #controls="{ moveUp, moveDown, canMove, selected: tag }">
          <div class="flex gap-1 sm:flex-col">
            <UButton size="xs" color="neutral" variant="outline" label="Earlier" :disabled="!canMove('up')" @click="moveUp" />
            <UButton size="xs" color="neutral" variant="outline" label="Later" :disabled="!canMove('down')" @click="moveDown" />
            <span class="text-xs text-muted" data-custom-selected>{{ tag?.label ?? 'none' }}</span>
          </div>
        </template>
      </ZOrderList>
    </div>
  </section>
</template>
