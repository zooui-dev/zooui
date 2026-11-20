<script setup lang="ts" generic="T extends object, VK extends (keyof T & string) | undefined = undefined">
// A faceted filter for a list or table toolbar: a button naming the filter, with a chip per chosen value (up to
// `maxShown`, then one chip saying how many), that opens a searchable list of options to check, each with an
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
// never through v-html. Checking or unchecking an option clears the search, so the next pick
// starts from the whole list. All checks every option on screen (the matches, while searching) and leaves the search
// as it is; Clear empties the filter.
//
// KEYBOARD. Focus opens in the search box. The arrow keys, Home and End move through the options; Enter checks one.
// Space checks one too, from the search box, while the box is empty or once the arrows have moved since the last
// character typed; otherwise it is a space in the search. Escape closes the panel, and focus goes back to the
// button. Without `searchable`, focus opens in the list itself and Space is reka-ui's own. Each change is
// announced politely ("Status: 2 selected."), and the button's name carries the chips ("Status, Open, Blocked" or
// "Status, 3 selected").
//
// `ui` takes classes for the parts, as Nuxt UI's components do, merged over the defaults with tailwind-merge (the
// same merge Nuxt UI's own `ui` goes through), so an override replaces the default it conflicts with rather than
// sitting beside it. A root `class` lands on the wrapper.
import type { ListboxItem } from '@nuxt/ui'
import { useLocale } from '@nuxt/ui/composables'
import { twMerge } from 'tailwind-merge'
import { filterSelectMatches, filterSelectSegments } from '../utils/filter-match'

type Value = VK extends keyof T ? T[VK] : T
type Part = 'trigger' | 'badge' | 'content' | 'search' | 'list' | 'item' | 'itemIcon' | 'itemLabel' | 'itemCount' | 'footer'

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
    /** The option field holding classes for its icon ("text-success"). Unset: `iconClass`. Without any, `text-dimmed`. */
    iconClassKey?: keyof T & string
    /** How many chosen values the button names, a chip each, before it shows one "N selected" chip. 0: always a count. */
    maxShown?: number
    /** Whether the panel has an All button. Without it, the footer shows only while something is chosen. */
    showSelectAll?: boolean
    /** Classes for the parts, merged over the defaults. */
    ui?: Partial<Record<Part, string>>
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
    /** The count chip's words, also read in the button's name; "3 selected" unless given. */
    selectedLabel?: (count: number) => string
    /** What a screen reader hears when the selection changes; "Status: 2 selected." unless given. */
    announce?: (change: { label: string; count: number }) => string
  }>(),
  {
    valueKey: undefined,
    labelKey: undefined,
    countKey: undefined,
    iconKey: undefined,
    iconClassKey: undefined,
    maxShown: 2,
    showSelectAll: true,
    ui: undefined,
    icon: 'i-lucide-list-filter',
    searchable: true,
    searchPlaceholder: 'Search',
    size: 'sm',
    disabled: false,
    portal: true,
    allLabel: 'All',
    clearLabel: 'Clear',
    emptyLabel: 'No matches',
    selectedLabel: undefined,
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
const iconClassOf = (option: T) => {
  const value = field(option, props.iconClassKey ?? 'iconClass')
  return typeof value === 'string' && value ? value : undefined
}
const isDisabled = (option: T) => field(option, 'disabled') === true
/** A part's classes: the defaults, then the caller's `ui` for it, conflicts going to the caller. */
const cls = (part: Part, ...defaults: (string | undefined)[]) => twMerge(...defaults, props.ui?.[part])
/** An option's icon: the default color only when the option brings none; the option's own over `ui.itemIcon`. */
const iconClasses = (option: T) => {
  const own = iconClassOf(option)
  return twMerge('size-4 shrink-0', own ? undefined : 'text-dimmed', props.ui?.itemIcon, own)
}
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

/** The chosen values' labels in the options' order; values no option holds follow, as written. */
const chosenLabels = computed(() => [
  ...props.options.filter(isSelected).map(labelOf),
  ...model.value.filter((v) => !props.options.some((o) => same(valueOf(o), v))).map((v) => String(v)),
])
/** The button's chips: one per value up to `maxShown`, otherwise one saying how many. */
const chips = computed(() => {
  const n = model.value.length
  if (!n) return []
  return n <= props.maxShown ? chosenLabels.value : [props.selectedLabel?.(n) ?? `${n} selected`]
})
// The button's name, the chips said in words: "Status, Open, Blocked" or "Status, 3 selected". It starts with the
// visible label, so speech input still finds the button by what it shows.
const buttonName = computed(() => (chips.value.length ? `${props.label}, ${chips.value.join(', ')}` : undefined))

// A chip cut short by the cap carries its whole text as a title. Measured once drawn, and again as the pointer or
// focus reaches the button, since a web font arriving late can change what fits.
const chipBox = ref<HTMLElement | null>(null)
const cutShort = ref<boolean[]>([])
function measureChips() {
  cutShort.value = [...(chipBox.value?.children ?? [])].map((el) => el.scrollWidth > el.clientWidth)
}
watch([chips, chipBox], measureChips, { flush: 'post' })

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

/** A check from the list (click, Enter or Space): the new selection, and the search cleared for the next pick. */
function onPick(values: Value[]) {
  model.value = values
  query.value = ''
  navigated = false
}

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
  ? { placeholder: props.searchPlaceholder, icon: 'i-lucide-search', autocomplete: 'off', 'aria-label': `Search ${props.label}`, 'data-search': '', class: props.ui?.search }
  : false)
</script>

<template>
  <div class="inline-flex" data-filter-select v-bind="$attrs">
    <UPopover v-model:open="open" :portal="portal" :content="{ side: 'bottom', align: 'start', sideOffset: 6 }" :ui="{ content: cls('content', 'w-64') }">
      <UButton
        type="button"
        variant="outline"
        color="neutral"
        :size="size"
        :icon="icon || undefined"
        :disabled="disabled"
        :aria-label="buttonName"
        :class="ui?.trigger"
        data-trigger
        @pointerenter="measureChips"
        @focus="measureChips"
      >
        <span>{{ label }}</span>
        <!-- Not UBadges: their block padding and line height would make a button with chips taller than one without,
             and a theme may restyle badges (Forest sets them in the mono face). These take the button's own line
             height and font, so the button is the same height whatever it holds and the values read as words. The
             row is capped, and a grid rather than a flex row: its tracks grow each chip toward its whole width and give
             what is left to the longer ones, so a short chip ("Low") stays whole and only a long one truncates. -->
        <span v-if="chips.length" ref="chipBox" class="grid min-w-0 max-w-40 auto-cols-[minmax(0,max-content)] grid-flow-col gap-1" data-badges>
          <span
            v-for="(chip, i) in chips"
            :key="i"
            :class="cls('badge', 'min-w-0 truncate rounded-sm bg-elevated px-1.5 text-[0.875em] text-default tabular-nums')"
            :title="cutShort[i] ? chip : undefined"
            data-badge
          >{{ chip }}</span>
        </span>
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
            :ui="{ root: 'rounded-none ring-0', content: cls('list', 'max-h-72'), item: ui?.item }"
            @update:model-value="onPick($event as Value[])"
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
              <UIcon v-if="iconOf(item as T)" :name="iconOf(item as T)!" :class="iconClasses(item as T)" aria-hidden="true" data-icon />
              <span :class="cls('itemLabel', 'min-w-0 flex-1 truncate')" data-label>
                <slot name="option-label" :option="(item as T)" :segments="filterSelectSegments(labelOf(item as T), query)" :selected="isSelected(item as T)">
                  <template v-for="(segment, i) in filterSelectSegments(labelOf(item as T), query)" :key="i">
                    <mark v-if="segment.match" class="rounded-xs bg-primary/15 font-semibold text-highlighted">{{ segment.text }}</mark>
                    <template v-else>{{ segment.text }}</template>
                  </template>
                </slot>
              </span>
              <span v-if="countOf(item as T) !== undefined" :class="cls('itemCount', 'ms-auto shrink-0 text-xs tabular-nums text-muted')" data-count>
                {{ formatCount(countOf(item as T)!) }}
              </span>
            </template>
            <template #empty>{{ emptyLabel }}</template>
          </UListbox>

          <!-- Without All, the footer is there only while Clear has something to clear. -->
          <div v-if="showSelectAll || model.length" :class="cls('footer', 'flex gap-1 border-t border-default p-1')" data-footer>
            <UButton v-if="showSelectAll" type="button" size="xs" variant="ghost" color="neutral" icon="i-lucide-check-check" class="flex-1 justify-center" :disabled="!checkable.length || allSelected" data-all @click="selectAll">
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
