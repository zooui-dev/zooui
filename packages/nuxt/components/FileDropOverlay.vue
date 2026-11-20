<script setup lang="ts">
// Files dropped anywhere in the window — or in one region — rather than on a box: while files are dragged over the
// page a full-window overlay says what dropping does, and the drop hands the files back, sorted by `accept` and
// `multiple` into @drop and @rejected. Nuxt UI's UFileUpload is the box; this is the page. Written on Nuxt UI's tokens.
//
//   <ZFileDropOverlay accept="image/*,.pdf" multiple label="Drop receipts to attach them" @drop="upload" @rejected="warn" />
//
// The drag is counted, not tracked by target: dragenter and dragleave fire for every element the pointer crosses,
// enter on the new one before leave on the old, so the overlay is shown while the count is above zero and the page's
// own children cannot make it flicker. Only drags that carry files count; text, links and elements dragged within the
// page are left alone. The overlay stays mounted for the whole drag, made invisible and click-through when it is
// dismissed (Escape) or `disabled`, so the pointer never leaves an element that is gone and the count never sticks.
import { dragCarriesFiles, sortDroppedFiles, type RejectedFile } from '../utils/file-drop'

defineOptions({ inheritAttrs: false })

const props = withDefaults(
  defineProps<{
    /** Files to take, as the native input's `accept`: MIME types, `image/*`, `.pdf`, comma-separated or a list. */
    accept?: string | string[]
    /** Take every matching file; without it the first is taken and the rest go to @rejected. */
    multiple?: boolean
    /** No overlay and no @drop; a file dropped is still kept from opening in the tab. */
    disabled?: boolean
    /** What the overlay says, and what a screen reader hears when it appears. */
    label?: string
    /** A second line under the label. */
    description?: string
    /** The overlay's icon; `false` for none. */
    icon?: string | false
    /** Take drops in this element only, with the overlay over it, rather than the window: an element (a template ref
     *  to one), a component, or a selector. `null` takes no drops, for a ref that isn't set yet. */
    target?: HTMLElement | { $el: unknown } | string | null
  }>(),
  {
    accept: undefined,
    multiple: false,
    disabled: false,
    label: 'Drop files here',
    description: undefined,
    icon: 'i-lucide-upload',
    target: undefined,
  },
)
const emit = defineEmits<{
  /** The files taken, in drop order; not emitted when none were. */
  drop: [files: File[]]
  /** The files refused, each with its reason; not emitted when none were. */
  rejected: [files: RejectedFile[]]
}>()
defineSlots<{
  /** The overlay's message, in place of the icon, label and description. */
  default?(props: { label: string; accept?: string | string[]; multiple: boolean }): unknown
}>()

/** Files are being dragged over the page (or the target): the overlay is mounted. */
const dragging = ref(false)
/** Escape was pressed during this drag: the overlay stays hidden until the drag ends. */
const dismissed = ref(false)
const visible = computed(() => dragging.value && !dismissed.value && !props.disabled)
const rect = ref<DOMRect | null>(null)

let depth = 0
function reset() {
  depth = 0
  dragging.value = false
  dismissed.value = false
}

/** The scoped region, when `target` names one; null for the window. */
function resolveTarget(): HTMLElement | null {
  const t = props.target
  if (!t) return null
  if (typeof t === 'string') return document.querySelector<HTMLElement>(t)
  if (t instanceof HTMLElement) return t
  return t.$el instanceof HTMLElement ? t.$el : null
}
const scoped = ref<HTMLElement | null>(null)
function measure() {
  rect.value = scoped.value?.getBoundingClientRect() ?? null
}

function onEnter(e: DragEvent) {
  if (!dragCarriesFiles(e.dataTransfer)) return
  depth += 1
  if (!dragging.value) measure()
  dragging.value = true
}
function onLeave() {
  if (!depth) return
  depth -= 1
  if (!depth) reset()
}
function onOver(e: DragEvent) {
  if (!dragCarriesFiles(e.dataTransfer)) return
  if (scoped.value) measure()
  // Hidden (disabled, or dismissed), a drop zone under the pointer that took the event (a modal's UFileUpload) keeps
  // its own dropEffect: 'none' here would cancel its drop. Shown, the overlay is under the pointer, so there is none.
  if (!visible.value && e.defaultPrevented) return
  // Without this the drop never fires and the browser opens the file in the tab.
  e.preventDefault()
  if (e.dataTransfer) e.dataTransfer.dropEffect = visible.value ? 'copy' : 'none'
}
/** A file drop anywhere in the page (or the target) but the overlay: kept from opening in the tab, and the drag is over. */
function onDropElsewhere(e: DragEvent) {
  if (dragCarriesFiles(e.dataTransfer)) e.preventDefault()
  reset()
}
function onOverlayDrop(e: DragEvent) {
  e.preventDefault()
  const take = visible.value
  reset()
  if (!take || !e.dataTransfer) return
  const { accepted, rejected } = sortDroppedFiles(e.dataTransfer.files, { accept: props.accept, multiple: props.multiple })
  if (accepted.length) emit('drop', accepted)
  if (rejected.length) emit('rejected', rejected)
}
// Scoped, the overlay is outside the target (it's in <body>), so its own enter and leave are counted here; over the
// window they already reach the document.
function onOverlayEnter(e: DragEvent) {
  if (scoped.value) onEnter(e)
}
function onOverlayLeave() {
  if (scoped.value) onLeave()
}
function onOverlayOver(e: DragEvent) {
  if (scoped.value) onOver(e)
}
function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape' && visible.value) dismissed.value = true
}

let bound: HTMLElement | null = null
function bind(el: HTMLElement) {
  el.addEventListener('dragenter', onEnter)
  el.addEventListener('dragleave', onLeave)
  el.addEventListener('dragover', onOver)
  el.addEventListener('drop', onDropElsewhere)
  bound = el
}
function unbind() {
  if (!bound) return
  bound.removeEventListener('dragenter', onEnter)
  bound.removeEventListener('dragleave', onLeave)
  bound.removeEventListener('dragover', onOver)
  bound.removeEventListener('drop', onDropElsewhere)
  bound = null
}
function rebind() {
  unbind()
  reset()
  scoped.value = resolveTarget()
  // A target that names nothing (yet) takes no drops, rather than the whole window.
  if (props.target !== undefined && !scoped.value) return
  bind(scoped.value ?? document.documentElement)
}

// Client only: nothing is attached during SSR, and everything is taken off on unmount.
let mounted = false
onMounted(() => {
  mounted = true
  rebind()
  document.addEventListener('keydown', onKeydown)
})
watch(() => props.target, () => { if (mounted) rebind() }, { flush: 'post' })
onBeforeUnmount(() => {
  mounted = false
  unbind()
  document.removeEventListener('keydown', onKeydown)
})

// The announcement, set as the overlay appears and cleared as it goes, so the next drag is heard again.
const announcement = ref('')
watch(visible, (v) => { announcement.value = v ? props.label : '' })

const placed = computed(() => {
  const r = rect.value
  if (!scoped.value || !r) return undefined
  return { top: `${r.top}px`, left: `${r.left}px`, width: `${r.width}px`, height: `${r.height}px`, right: 'auto', bottom: 'auto' }
})

defineExpose({
  /** Whether the overlay is showing. */
  visible,
  /** Hide the overlay for the rest of this drag, as Escape does. */
  dismiss: () => { if (dragging.value) dismissed.value = true },
})
</script>

<template>
  <span class="sr-only" role="status" aria-live="polite" data-file-drop-announce>{{ announcement }}</span>
  <Teleport to="body">
    <div
      v-if="dragging"
      v-bind="$attrs"
      data-file-drop-overlay
      :data-state="visible ? 'open' : 'hidden'"
      aria-hidden="true"
      :style="placed"
      :class="[
        'fixed inset-0 z-50 flex items-center justify-center p-6 bg-default/75 backdrop-blur-sm transition-opacity duration-100 motion-reduce:transition-none',
        visible ? 'opacity-100' : 'pointer-events-none opacity-0',
      ]"
      @dragenter="onOverlayEnter"
      @dragleave="onOverlayLeave"
      @dragover="onOverlayOver"
      @drop="onOverlayDrop"
    >
      <div class="pointer-events-none flex max-w-md flex-col items-center gap-3 rounded-lg border-2 border-dashed border-accented bg-elevated px-10 py-8 text-center shadow-lg" data-file-drop-message>
        <slot :label="label" :accept="accept" :multiple="multiple">
          <UIcon v-if="icon" :name="icon" class="size-10 text-primary" data-file-drop-icon />
          <p class="text-base font-semibold text-highlighted">{{ label }}</p>
          <p v-if="description" class="text-sm text-muted">{{ description }}</p>
        </slot>
      </div>
    </div>
  </Teleport>
</template>
