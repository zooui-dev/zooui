<script setup lang="ts">
/**
 * The one place useConfirm()'s questions render. Mount it once, inside <UApp> beside the page:
 *
 *   <UApp><NuxtPage /><ZConfirmDialog /></UApp>
 *
 * A ZModal announced as an `alertdialog`, titled by the question and described by its description. Each question is
 * shown in turn: a call made while one is open waits until it is answered (utils/confirm-queue.ts). Escape, the close
 * button and a click outside are a cancel: `confirm` resolves `false`, `choose` `null`.
 *
 * FOCUS starts on Cancel when the question is destructive (`destructive`, or `color: 'error'`), so Enter can't do the
 * harm; otherwise on the last action, the confirming one. The dialog closes, and focus goes back where it was, before
 * the next question opens.
 */
import { computed, onBeforeUnmount, ref, shallowRef, watch } from 'vue'
import { EDGE_COLORS, type EdgeColor } from './edge'
import { confirmController, isDestructive, type ConfirmAction, type ConfirmColor, type ConfirmEntry } from './confirm'

const props = withDefaults(defineProps<{
  /** The dismissing button's label, where a question doesn't give its own. */
  cancelLabel?: string
  /** The confirming button's label for `confirm()`, where a question doesn't give its own. */
  confirmLabel?: string
}>(), { cancelLabel: 'Cancel', confirmLabel: 'Confirm' })

const controller = confirmController(useNuxtApp())
// counted for useConfirm()'s "no host" warning; in setup, so a page asking from its own onMounted is already counted
if (import.meta.client) {
  controller.hosts++
  onBeforeUnmount(() => { controller.hosts-- })
}

/** What the modal shows: kept through its leave animation, so the next question opens only once this one has gone. */
const shown = shallowRef<ConfirmEntry>()
const open = ref(false)

function show(entry: ConfirmEntry | undefined) {
  if (!entry || shown.value) return
  shown.value = entry
  open.value = true
}
watch(controller.current, (entry) => {
  // settled from outside the dialog (dismissAll): close it, and afterLeave shows whatever is next
  if (open.value && shown.value && entry?.id !== shown.value.id) open.value = false
  show(entry)
}, { immediate: true })

function afterLeave() {
  shown.value = undefined
  show(controller.current.value)
}

/** Answer the shown question, once: a second click on a closing dialog is ignored here and by the queue. */
function settle(answer: (id: number) => void) {
  const entry = shown.value
  if (!entry || !open.value) return
  open.value = false
  answer(entry.id)
}
const dismiss = () => settle((id) => controller.queue.dismiss(id))
const pick = (value: unknown) => settle((id) => controller.queue.answer(id, value))

const options = computed(() => shown.value?.request.options)
const destructive = computed(() => !!options.value && isDestructive(options.value))

const actions = computed<ConfirmAction<unknown>[]>(() => {
  const request = shown.value?.request
  if (!request) return []
  const color = request.options.color
  if (request.kind === 'confirm') {
    return [{ label: request.options.confirmLabel ?? props.confirmLabel, value: true, color: color ?? 'primary' }]
  }
  return request.options.actions.map((action) => ({ ...action, color: action.color ?? color ?? 'primary' }))
})

const isEdgeColor = (c: ConfirmColor | undefined): c is EdgeColor => (EDGE_COLORS as readonly string[]).includes(c ?? '')
const edgeColor = computed(() => (isEdgeColor(options.value?.color) ? options.value.color : undefined))

/** The icon's badge, on Nuxt UI's tokens; written out in full so Tailwind's scan finds them. */
const BADGE: Record<string, string> = {
  primary: 'bg-primary/10 text-primary',
  secondary: 'bg-secondary/10 text-secondary',
  success: 'bg-success/10 text-success',
  info: 'bg-info/10 text-info',
  warning: 'bg-warning/10 text-warning',
  error: 'bg-error/10 text-error',
  neutral: 'bg-elevated text-highlighted',
}
const badge = computed(() => BADGE[options.value?.color ?? 'neutral'] ?? BADGE.neutral)

/** Into the dialog: Cancel for a destructive question, else the last (confirming) action. */
function placeFocus(event: Event) {
  const root = event.currentTarget instanceof Element ? event.currentTarget : document
  const target = root.querySelector<HTMLElement>('[data-confirm-autofocus]')
  if (!target) return
  event.preventDefault()
  target.focus()
}

const content = { 'role': 'alertdialog', 'data-confirm-dialog': '', 'onOpenAutoFocus': placeFocus }
</script>

<template>
  <ZModal
    :open="open"
    :title="options?.title"
    :description="options?.description"
    :color="edgeColor"
    :content="content"
    :ui="{ content: 'sm:max-w-md', footer: 'justify-end gap-2' }"
    @update:open="(value: boolean) => { if (!value) dismiss() }"
    @after:leave="afterLeave"
  >
    <template v-if="options?.icon" #title>
      <span class="flex items-center gap-3">
        <span class="grid size-8 shrink-0 place-items-center rounded-full" :class="badge" data-confirm-icon>
          <UIcon :name="options.icon" class="size-4" aria-hidden="true" />
        </span>
        {{ options.title }}
      </span>
    </template>

    <template v-if="options?.details?.length" #body>
      <!-- toned, not muted: muted on the elevated ground falls under 4.5:1 on some Forest schemes in light mode -->
      <ul class="flex flex-col gap-1.5 text-sm text-toned" data-confirm-details>
        <li v-for="(detail, i) in options.details" :key="i" class="rounded-md bg-elevated px-3 py-2">{{ detail }}</li>
      </ul>
    </template>

    <template #footer>
      <UButton
        :label="options?.cancelLabel ?? cancelLabel"
        color="neutral"
        variant="outline"
        data-confirm-cancel
        :data-confirm-autofocus="destructive ? '' : undefined"
        @click="dismiss"
      />
      <UButton
        v-for="(action, i) in actions"
        :key="i"
        :label="action.label"
        :icon="action.icon"
        :color="action.color"
        :variant="action.variant ?? 'solid'"
        data-confirm-action
        :data-confirm-autofocus="!destructive && i === actions.length - 1 ? '' : undefined"
        @click="pick(action.value)"
      />
    </template>
  </ZModal>
</template>
