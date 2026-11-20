<script setup lang="ts">
/**
 * ZOrderList in the shapes a product uses it: a master-detail status editor (the selected status's form beside the
 * list, Add and a confirmed Remove, which can be refused as a failed server call would), a long striped list that
 * scrolls, titled by its rows' own text, groups whose Remove has no handler (the list removes the row itself),
 * folders that fill a fixed-height panel with `fill` and `ui`, and a toolbar of the caller's own through
 * #controls. Typed: the @vue-expect-error below fails the typecheck if the generic were lost.
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
// Refusing stands in for a failed server call: the caller decides not to remove, and the list must not stay armed.
const refuseDeletes = ref(false)
const refused = ref<string[]>([])
function removeStatus(status: Status) {
  if (refuseDeletes.value) { refused.value.push(status.name); return }
  statuses.value = statuses.value.filter((s) => s !== status)
}
/** A reload from the server, where Ready has since been deleted: new objects, the same keys, one fewer. */
function reloadWithoutReady() {
  statuses.value = statuses.value.filter((s) => s.id !== 'ready').map((s) => ({ ...s }))
}

const steps = ref<Step[]>(Array.from({ length: 30 }, (_, i) => ({ id: i + 1, text: `Step ${i + 1}` })))
const stepId = ref<string | number | null>(null)

// No @remove: the list takes the row out of v-model itself.
const groups = ref([{ id: 1, name: 'Partners' }, { id: 2, name: 'Managers' }, { id: 3, name: 'Staff' }, { id: 4, name: 'Seasonal' }])
const groupId = ref<string | number | null>(null)

const folders = ref(['Engagement letters', 'Workpapers', 'Correspondence', 'Tax returns', 'Invoices', 'Archive'].map((name, i) => ({ id: i + 1, name })))
const folderId = ref<string | number | null>(1)

const tags = ref([{ key: 'a', label: 'Alpha' }, { key: 'b', label: 'Beta' }, { key: 'c', label: 'Gamma' }])
const tagKey = ref<string | number | null>('b')
</script>

<template>
  <section id="order-list" class="flex flex-col gap-8" aria-labelledby="order-list-title">
    <header class="flex flex-col gap-1" data-demo-header>
      <h2 id="order-list-title" class="text-base font-semibold text-highlighted">ZOrderList</h2>
      <p class="max-w-2xl text-sm text-muted">
        An ordered list with one selected row and a toolbar that adds, removes and moves it: the list half of a
        master-detail editor. The readouts under each list show what the list hands back: its order, the selected
        item's key, and each move it reported.
      </p>
    </header>

    <div data-specimen="order-list-statuses" class="flex flex-col gap-2">
      <h3 class="text-sm font-semibold text-highlighted">Statuses: a master-detail editor</h3>
      <p class="text-sm text-muted" data-try>
        Try this: click Review, then press Alt+Up or use the toolbar to move it. Edit its name in the form, and the row
        follows. Done can't be removed. Turn on "Refuse deletes", remove Ready, pick another row, then reload: nothing
        is announced and the selection stays put.
      </p>
      <p class="text-xs text-muted" data-toolbar-key>
        Toolbar, in order: Add, Remove, Move to top, Move up, Move down, Move to bottom.
      </p>
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
      <dl class="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-xs" data-readouts>
        <dt class="font-medium text-toned">Order (v-model)</dt>
        <dd class="text-muted"><span data-order>{{ statuses.map((s) => s.name).join(', ') }}</span></dd>
        <dt class="font-medium text-toned">Selected key (v-model:selection)</dt>
        <dd class="text-muted"><span data-selection>{{ selectedId ?? 'none' }}</span></dd>
        <dt class="font-medium text-toned">Reorders (@reorder, item from→to)</dt>
        <dd class="text-muted"><span data-reorders>{{ reorders.join('; ') }}</span></dd>
        <dt class="font-medium text-toned">Refused deletes</dt>
        <dd class="text-muted"><span data-refused>{{ refused.join(', ') || 'none' }}</span></dd>
      </dl>
      <div class="flex flex-wrap items-center gap-4">
        <USwitch v-model="refuseDeletes" label="Refuse deletes (a failed server call)" data-refuse />
        <UButton size="xs" color="neutral" variant="outline" label="Reload, with Ready deleted elsewhere" data-reload @click="reloadWithoutReady" />
      </div>
    </div>

    <div data-specimen="order-list-steps" class="flex max-w-sm flex-col gap-2">
      <h3 class="text-sm font-semibold text-highlighted">Steps: a long, striped list</h3>
      <p class="text-sm text-muted" data-try>
        Try this: focus the list and press End; the last step scrolls into view. Alt+Home moves it to the top. Remove
        acts at once here, with no question.
      </p>
      <p class="text-xs text-muted" data-toolbar-key>
        Toolbar, in order: Remove, Move to top, Move up, Move down, Move to bottom.
      </p>
      <ZOrderList v-model="steps" v-model:selection="stepId" :row-key="(s) => s.id" label="Steps" max-height="10rem" striped :allow-add="false" allow-remove :confirm-remove="false" @remove="(s) => (steps = steps.filter((x) => x !== s))">
        <template #item="{ item }">{{ item.text }}</template>
      </ZOrderList>
    </div>

    <div data-specimen="order-list-groups" class="flex max-w-sm flex-col gap-2">
      <h3 class="text-sm font-semibold text-highlighted">Groups: Remove with no handler</h3>
      <p class="text-sm text-muted" data-try>
        Try this: select Managers and remove it. Nothing listens to @remove here, so the list takes the row out of
        v-model itself and selects the row that took its place.
      </p>
      <p class="text-xs text-muted" data-toolbar-key>
        Toolbar, in order: Remove, Move to top, Move up, Move down, Move to bottom.
      </p>
      <ZOrderList v-model="groups" v-model:selection="groupId" :row-key="(g) => g.id" :row-title="(g) => g.name" label="Groups" :allow-add="false" allow-remove remove-question="Delete this group?">
        <template #item="{ item }">{{ item.name }}</template>
      </ZOrderList>
      <dl class="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-xs">
        <dt class="font-medium text-toned">Order (v-model)</dt>
        <dd class="text-muted"><span data-groups-order>{{ groups.map((g) => g.name).join(', ') }}</span></dd>
        <dt class="font-medium text-toned">Selected key (v-model:selection)</dt>
        <dd class="text-muted"><span data-groups-selection>{{ groupId ?? 'none' }}</span></dd>
      </dl>
    </div>

    <div data-specimen="order-list-folders" class="flex max-w-md flex-col gap-2">
      <h3 class="text-sm font-semibold text-highlighted">Folders: filling a panel</h3>
      <p class="text-sm text-muted" data-try>
        Try this: the panel below is 18rem tall, and with `fill` the list's box stretches to its bottom instead of
        stopping at `max-height`. Its rows are tighter through `ui.row`.
      </p>
      <p class="text-xs text-muted" data-toolbar-key>
        Toolbar, in order: Add, Move to top, Move up, Move down, Move to bottom.
      </p>
      <div class="h-72 rounded-md border border-dashed border-default p-2" data-fill-panel>
        <ZOrderList v-model="folders" v-model:selection="folderId" :row-key="(f) => f.id" title="Folders" fill :ui="{ row: 'py-1' }" @add="folders.push({ id: folders.length + 1, name: `Folder ${folders.length + 1}` })">
          <template #item="{ item }">{{ item.name }}</template>
        </ZOrderList>
      </div>
    </div>

    <div data-specimen="order-list-custom" class="flex max-w-sm flex-col gap-2">
      <h3 class="text-sm font-semibold text-highlighted">Tags: a toolbar of your own</h3>
      <p class="text-sm text-muted" data-try>
        Try this: press Later until it disables at the bottom, then Earlier. The toolbar is the #controls slot.
      </p>
      <ZOrderList v-model="tags" v-model:selection="tagKey" :row-key="(t) => t.key" label="Tags">
        <template #item="{ item }">{{ item.label }}</template>
        <template #controls="{ moveUp, moveDown, canMove, selected: tag }">
          <div class="flex gap-1 sm:flex-col">
            <UButton size="xs" color="neutral" variant="outline" label="Earlier" :disabled="!canMove('up')" @click="moveUp" />
            <UButton size="xs" color="neutral" variant="outline" label="Later" :disabled="!canMove('down')" @click="moveDown" />
            <span class="text-xs text-muted">Selected: <span data-custom-selected>{{ tag?.label ?? 'none' }}</span></span>
          </div>
        </template>
      </ZOrderList>
    </div>
  </section>
</template>
