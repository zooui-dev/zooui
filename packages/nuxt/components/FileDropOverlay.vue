<script lang="ts">
/**
 * Drag events an overlay nearer the event's target has already counted. Every instance shares it: listeners on an
 * inner target run before those on an outer one (or the window), so the innermost overlay under the pointer claims each
 * event and the outer ones leave it alone. That splits the drag's count by region: the dialog's overlay counts what
 * happens over the dialog, the page's what happens over the rest, and each shows only while the pointer is over its own.
 */
const claimed = new WeakSet<Event>()
function claim(e: Event) {
  if (claimed.has(e)) return false
  claimed.add(e)
  return true
}
</script>

<script setup lang="ts">
// Files dropped anywhere in the window — or in one element, a dialog say — rather than on a box: while files are
// dragged over it an overlay says what dropping does, and the drop hands the files back, sorted by `accept` and
// `multiple` into @drop and @rejected. Nuxt UI's UFileUpload is the box; this is the page. Written on Nuxt UI's tokens.
//
//   <ZFileDropOverlay accept="image/*,.pdf" multiple label="Drop receipts to attach them" @drop="upload" @rejected="warn" />
//   <div ref="body"> … <ZFileDropOverlay :target="body" @drop="add" /></div>      <!-- contained in the element -->
//
// The drag is counted, not tracked by target: dragenter and dragleave fire for every element the pointer crosses,
// enter on the new one before leave on the old, so the overlay is shown while the count is above zero and the page's
// own children cannot make it flicker. Only drags that carry files count; text, links and elements dragged within the
// page are left alone. The overlay is only a picture (`pointer-events: none`): the drag's events stay on the page's
// own elements, so showing or hiding it never moves the pointer off one, a drop zone under it still gets its drop, and
// an overlay nested inside it can be reached.
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
    /** Take drops in this element only, with the overlay drawn inside it, rather than the window: an element (a template
     *  ref to one), a component, or a selector. `null` takes no drops, for a ref that isn't set yet. A selector is
     *  looked up when the overlay mounts: for an element rendered later (a dialog's content), pass a template ref. */
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

/** Files are being dragged over the window (or the target), outside any overlay nested in it. */
const dragging = ref(false)
/** Escape was pressed during this drag: the overlay stays hidden until the drag ends. */
const dismissed = ref(false)
const visible = computed(() => dragging.value && !dismissed.value && !props.disabled)

let depth = 0
function reset() {
  depth = 0
  dragging.value = false
  dismissed.value = false
}

/** The element the overlay is contained in, when `target` names one; null for the window. */
function resolveTarget(): HTMLElement | null {
  const t = props.target
  if (!t) return null
  if (typeof t === 'string') return document.querySelector<HTMLElement>(t)
  if (t instanceof HTMLElement) return t
  return t.$el instanceof HTMLElement ? t.$el : null
}
const scoped = shallowRef<HTMLElement | null>(null)

// Every handler claims the file drag's event first: one an overlay nested deeper already claimed is its own, so this
// one neither counts nor answers it. Claimed whether or not this one is disabled, so the count stays whole when
// `disabled` changes mid-drag.
function onEnter(e: DragEvent) {
  if (!dragCarriesFiles(e.dataTransfer) || !claim(e)) return
  depth += 1
  dragging.value = true
}
function onLeave(e: DragEvent) {
  if (!dragCarriesFiles(e.dataTransfer) || !claim(e)) return
  if (!depth) return
  depth -= 1
  if (!depth) reset()
}
function onOver(e: DragEvent) {
  if (!dragCarriesFiles(e.dataTransfer) || !claim(e)) return
  // A drop zone under the pointer that took the event (a UFileUpload) keeps its own dropEffect: 'none' here would
  // cancel its drop, and 'copy' would let through one it refused.
  if (e.defaultPrevented) return
  // Without this the drop never fires and the browser opens the file in the tab.
  e.preventDefault()
  if (e.dataTransfer) e.dataTransfer.dropEffect = visible.value ? 'copy' : 'none'
}
function onDrop(e: DragEvent) {
  if (!dragCarriesFiles(e.dataTransfer)) return
  // The drop ends the drag for every overlay; only the one it was claimed by can take it.
  if (!claim(e)) return reset()
  // A drop zone under the pointer took these files itself: handing them out again would add them twice.
  const takenByZone = e.defaultPrevented
  e.preventDefault()
  const take = visible.value && !takenByZone
  reset()
  if (!take || !e.dataTransfer) return
  const { accepted, rejected } = sortDroppedFiles(e.dataTransfer.files, { accept: props.accept, multiple: props.multiple })
  if (accepted.length) emit('drop', accepted)
  if (rejected.length) emit('rejected', rejected)
}
function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape' && visible.value) dismissed.value = true
}

let bound: HTMLElement | null = null
/** The target's own `position` before it was made a positioning context for the overlay, to put back. */
let ownPosition: string | null = null
function bind(el: HTMLElement) {
  el.addEventListener('dragenter', onEnter)
  el.addEventListener('dragleave', onLeave)
  el.addEventListener('dragover', onOver)
  el.addEventListener('drop', onDrop)
  if (el !== document.documentElement && getComputedStyle(el).position === 'static') {
    ownPosition = el.style.position
    el.style.position = 'relative'
  }
  bound = el
}
function unbind() {
  if (!bound) return
  bound.removeEventListener('dragenter', onEnter)
  bound.removeEventListener('dragleave', onLeave)
  bound.removeEventListener('dragover', onOver)
  bound.removeEventListener('drop', onDrop)
  if (ownPosition !== null) bound.style.position = ownPosition
  ownPosition = null
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

defineExpose({
  /** Whether the overlay is showing. */
  visible,
  /** Hide the overlay for the rest of this drag, as Escape does. */
  dismiss: () => { if (dragging.value) dismissed.value = true },
})
</script>

<template>
  <span class="sr-only" role="status" aria-live="polite" data-file-drop-announce>{{ announcement }}</span>
  <!-- Over the window, in <body>; contained, inside the target itself, so it sits in the target's stacking context
       (a dialog's, over the dialog's content) with no measuring. -->
  <Teleport :to="scoped ?? 'body'">
    <div
      v-if="visible"
      v-bind="$attrs"
      data-file-drop-overlay
      :data-contained="scoped ? '' : undefined"
      aria-hidden="true"
      :class="[
        'pointer-events-none flex items-center justify-center bg-default/75 backdrop-blur-sm',
        scoped ? 'absolute inset-0 z-10 rounded-[inherit] p-3' : 'fixed inset-0 z-50 p-6',
      ]"
    >
      <div class="flex max-w-full flex-col items-center gap-3 rounded-lg border-2 border-dashed border-accented bg-elevated px-10 py-8 text-center shadow-lg" data-file-drop-message>
        <slot :label="label" :accept="accept" :multiple="multiple">
          <UIcon v-if="icon" :name="icon" class="size-10 text-primary" data-file-drop-icon />
          <p class="text-base font-semibold text-highlighted">{{ label }}</p>
          <p v-if="description" class="text-sm text-muted">{{ description }}</p>
        </slot>
      </div>
    </div>
  </Teleport>
</template>
