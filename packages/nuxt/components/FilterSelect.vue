<script setup lang="ts" generic="T extends object, VK extends (keyof T & string) | undefined = undefined">
// A faceted filter for a list or table toolbar: a button naming the filter, with a badge for what is chosen (the
// value when it is one, the number when it is more), that opens a searchable list of options to check, each with an
// optional count of the records it matches and an optional icon, and All and Clear under them.
//
//   <ZFilterSelect v-model="statuses" label="Status" :options="statusOptions" value-key="value" />
//   <ZFilterSelect v-model="owners" label="Owner" :options="people" value-key="id" label-key="name" count-key="open" />
//
// The list is Nuxt UI's UListbox (reka-ui's Listbox: role="listbox", aria-multiselectable, an aria-activedescendant
// search box) in a UPopover. v-model is an array of values: each option's `valueKey` field, or the option itself
// without one (then compared by identity). Values the options no longer hold are kept, not dropped.
//
// SEARCH is literal and case-insensitive (utils/filter-match.ts): what is typed is text, never a pattern, so `(` or
// `.` match themselves. The options keep their order, and each label is drawn as segments with the matches in <mark>,
// never through v-html. All checks every option on screen (the matches, while searching); Clear empties the filter.
//
// KEYBOARD. Focus opens in the search box. The arrow keys, Home and End move through the options; Enter checks one.
// Space checks one too, from the search box, while the box is empty or once the arrows have moved since the last
// character typed; otherwise it is a space in the search. Escape closes the panel, and focus goes back to the
// button. Without `searchable`, focus opens in the list itself and Space is reka-ui's own. Each change is
// announced politely ("Status: 2 selected."), and the button's name carries it ("Status, 2 selected").
import type { ListboxItem } from '@nuxt/ui'
import { useLocale } from '@nuxt/ui/composables'
import { filterSelectMatches, filterSelectSegments } from '../utils/filter-match'

type Value = VK extends keyof T ? T[VK] : T

defineOptions({ inheritAttrs: false })

const props = withDefaults(
  defineProps<{
    /** The filter's name: the button's text, and the list's accessible name. "Status". */
    label: string
    /** The options, in the order they are listed. */
    options: T[]
    /** The option field that is its value in v-model. Unset: the option itself. */
    valueKey?: VK
    /** The option field shown as its label. Unset: `label`. */
    labelKey?: keyof T & string
    /** The option field holding how many records it matches, shown beside it. Unset: `count`. */
    countKey?: keyof T & string
    /** The option field holding its icon. Unset: `icon`. A product's own icons are the product's to bundle. */
    iconKey?: keyof T & string
    /** The button's leading icon; '' for none. */
    icon?: string
    /** Whether the panel has a search box. */
    searchable?: boolean
    /** Unset: "Search". The search box is named "Search <label>" for assistive tech. */
    searchPlaceholder?: string
    /** The button's size, as UButton's. */
    size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
    disabled?: boolean
    /** UPopover's `portal`. */
    portal?: boolean | string
    allLabel?: string
    clearLabel?: string
    /** Shown when nothing matches the search. Unset: "No matches". */
    emptyLabel?: string
    /** What a screen reader hears when the selection changes; "Status: 2 selected." unless given. */
    announce?: (change: { label: string; count: number }) => string
  }>(),
  {
    valueKey: undefined,
    labelKey: undefined,
    countKey: undefined,
    iconKey: undefined,
    icon: 'i-lucide-list-filter',
    searchable: true,
    searchPlaceholder: 'Search',
    size: 'sm',
    disabled: false,
    portal: true,
    allLabel: 'All',
    clearLabel: 'Clear',
    emptyLabel: 'No matches',
    announce: undefined,
  },
)
const model = defineModel<Value[]>({ default: () => [] })
defineSlots<{
  /** The option's label, in place of its highlighted text. */
  'option-label'?(props: { option: T; segments: ReturnType<typeof filterSelectSegments>; selected: boolean }): unknown
}>()

const uid = useId()
const { code: localeCode } = useLocale()
const open = ref(false)
const query = ref('')
const panel = ref<HTMLElement | null>(null)

const field = (option: T, key: string) => (option as Record<string, unknown>)[key]
const valueOf = (option: T) => (props.valueKey ? field(option, props.valueKey) : option) as Value
const labelOf = (option: T) => String(field(option, props.labelKey ?? 'label') ?? '')
const countOf = (option: T) => {
  const n = field(option, props.countKey ?? 'count')
  return typeof n === 'number' ? n : undefined
}
const iconOf = (option: T) => {
  const name = field(option, props.iconKey ?? 'icon')
  return typeof name === 'string' && name ? name : undefined
}
const isDisabled = (option: T) => field(option, 'disabled') === true
// Values are compared the same way here and in reka-ui (given as UListbox's `by`): a field's value by ===, an option
// by identity — of the raw object, since a model held in ref() hands back reactive proxies of the options.
const same = (a: unknown, b: unknown) => Object.is(toRaw(a), toRaw(b))
const has = (value: Value) => model.value.some((v) => same(v, value))
const isSelected = (option: T) => has(valueOf(option))

const shown = computed(() => props.options.filter((o) => filterSelectMatches(labelOf(o), query.value)))
const checkable = computed(() => shown.value.filter((o) => !isDisabled(o)))
const allSelected = computed(() => checkable.value.every(isSelected))

const countFormat = computed(() => new Intl.NumberFormat(localeCode.value))
const formatCount = (n: number) => countFormat.value.format(n)

/** The badge: the one value's label, or how many. */
const badge = computed(() => {
  if (model.value.length !== 1) return String(model.value.length)
  const v = model.value[0] as Value
  const option = props.options.find((o) => same(valueOf(o), v))
  return option ? labelOf(option) : String(v)
})
// The button's name, with the badge said in words: "Status, Open" or "Status, 2 selected". It starts with the visible
// label, so speech input still finds the button by what it shows.
const buttonName = computed(() => {
  if (!model.value.length) return undefined
  return `${props.label}, ${model.value.length === 1 ? badge.value : `${badge.value} selected`}`
})

function selectAll() {
  model.value = [...model.value, ...checkable.value.map(valueOf).filter((v) => !has(v))]
  refocus()
}
function clear() {
  model.value = []
  refocus()
}
/** After All or Clear, focus goes back into the list's search box (or the list), not to a button that may go disabled. */
function refocus() {
  panel.value?.querySelector<HTMLElement>('input, [role="listbox"]')?.focus()
}

// Space checks the highlighted option from the search box while the box is empty, or once the arrow keys have moved
// since the last character typed; otherwise it is part of the search.
let navigated = false
const NAVIGATION = new Set(['ArrowDown', 'ArrowUp', 'Home', 'End', 'PageUp', 'PageDown'])
function onKeydown(e: KeyboardEvent) {
  if (NAVIGATION.has(e.key)) {
    navigated = true
    return
  }
  if (e.key !== ' ' || !(e.target instanceof HTMLInputElement)) return
  if (query.value && !navigated) return
  const option = panel.value?.querySelector<HTMLElement>('[role="option"][data-highlighted]')
  if (!option) return
  e.preventDefault()
  option.click()
}

// The list is named for the filter, and the search box says which list it drives. UListbox puts neither attribute on
// the elements that need them, so they are set once the panel is drawn.
watch(
  [panel, () => props.label],
  ([el]) => {
    const list = el?.querySelector<HTMLElement>('[role="listbox"]')
    if (!list) return
    list.setAttribute('aria-label', props.label)
    list.id = `${uid}-list`
    el?.querySelector('input')?.setAttribute('aria-controls', list.id)
  },
  { flush: 'post' },
)

// A closed panel forgets its search.
watch(open, (isOpen) => {
  if (!isOpen) query.value = ''
  navigated = false
})

// The polite announcement of the selection. Cleared first and set again in a later task, so the same words twice are
// heard twice; a newer announcement replaces one still pending.
const announcement = ref('')
let announceTimer: ReturnType<typeof setTimeout> | undefined
watch(model, (values) => {
  const count = values.length
  const text = props.announce?.({ label: props.label, count }) ?? `${props.label}: ${count ? count : 'none'} selected.`
  announcement.value = ''
  clearTimeout(announceTimer)
  announceTimer = setTimeout(() => { announcement.value = text }, 100)
})
onBeforeUnmount(() => clearTimeout(announceTimer))

const searchInput = computed(() => props.searchable
  ? { placeholder: props.searchPlaceholder, icon: 'i-lucide-search', autocomplete: 'off', 'aria-label': `Search ${props.label}`, 'data-search': '' }
  : false)
</script>

<template>
  <div class="inline-flex" data-filter-select v-bind="$attrs">
    <UPopover v-model:open="open" :portal="portal" :content="{ side: 'bottom', align: 'start', sideOffset: 6 }" :ui="{ content: 'w-64' }">
      <UButton type="button" variant="outline" color="neutral" :size="size" :icon="icon || undefined" :disabled="disabled" :aria-label="buttonName" data-trigger>
        <span>{{ label }}</span>
        <UBadge v-if="model.length" color="neutral" variant="soft" size="sm" class="max-w-32 tabular-nums" data-badge>
          <span class="truncate">{{ badge }}</span>
        </UBadge>
      </UButton>

      <template #content>
        <div ref="panel" data-filter-panel @keydown="onKeydown" @input="navigated = false">
          <UListbox
            :model-value="(model as never)"
            :search-term="query"
            :items="(shown as ListboxItem[])"
            multiple
            :value-key="valueKey"
            :by="same"
            :filter="searchInput"
            ignore-filter
            :autofocus="searchable"
            :ui="{ root: 'rounded-none ring-0', content: 'max-h-72' }"
            @update:model-value="model = $event as Value[]"
            @update:search-term="query = $event"
          >
            <template #item="{ item }">
              <span
                aria-hidden="true"
                :class="[
                  'grid size-4 shrink-0 place-items-center rounded-sm border',
                  isSelected(item as T) ? 'border-primary bg-primary text-inverted' : 'border-accented bg-default',
                ]"
                data-check
              >
                <UIcon v-if="isSelected(item as T)" name="i-lucide-check" class="size-3" />
              </span>
              <UIcon v-if="iconOf(item as T)" :name="iconOf(item as T)!" class="size-4 shrink-0 text-dimmed" aria-hidden="true" />
              <span class="min-w-0 flex-1 truncate" data-label>
                <slot name="option-label" :option="(item as T)" :segments="filterSelectSegments(labelOf(item as T), query)" :selected="isSelected(item as T)">
                  <template v-for="(segment, i) in filterSelectSegments(labelOf(item as T), query)" :key="i">
                    <mark v-if="segment.match" class="rounded-xs bg-primary/15 font-semibold text-highlighted">{{ segment.text }}</mark>
                    <template v-else>{{ segment.text }}</template>
                  </template>
                </slot>
              </span>
              <span v-if="countOf(item as T) !== undefined" class="ms-auto shrink-0 text-xs tabular-nums text-muted" data-count>
                {{ formatCount(countOf(item as T)!) }}
              </span>
            </template>
            <template #empty>{{ emptyLabel }}</template>
          </UListbox>

          <div class="flex gap-1 border-t border-default p-1">
            <UButton type="button" size="xs" variant="ghost" color="neutral" icon="i-lucide-check-check" class="flex-1 justify-center" :disabled="!checkable.length || allSelected" data-all @click="selectAll">
              {{ allLabel }}
            </UButton>
            <UButton type="button" size="xs" variant="ghost" color="neutral" icon="i-lucide-x" class="flex-1 justify-center" :disabled="!model.length" data-clear @click="clear">
              {{ clearLabel }}
            </UButton>
          </div>
        </div>
      </template>
    </UPopover>
    <p class="sr-only" role="status" aria-live="polite" data-announce>{{ announcement }}</p>
  </div>
</template>
