<script setup lang="ts">
/**
 * The one place useConfirm()'s questions render. Mount it once, inside <UApp> beside the page:
 *
 *   <UApp><NuxtPage /><ZConfirmDialog /></UApp>
 *
 * A ZModal announced as an `alertdialog`, titled by the question and described by its description. As in Buoy's dialog,
 * the description sits in the body with the icon's badge beside it, and the details beneath it. Each question is
 * shown in turn: a call made while one is open waits until it is answered (utils/confirm-queue.ts). Escape, the close
 * button and a click outside are a cancel: `confirm` resolves `false`, `choose` `null`. A question asked with
 * `dismissible: false` ignores Escape and a click outside; Cancel and the close button still cancel it.
 *
 * FOCUS starts on Cancel when the question is destructive (`destructive`, or `color` or `confirmColor` `error`), so
 * Enter can't do the harm; otherwise on the last action, the confirming one. The dialog closes, and focus goes back where it was, before
 * the next question opens.
 */
import { computed, onBeforeUnmount, ref, shallowRef, useId, watch } from 'vue'
import { EDGE_COLORS, type EdgeColor } from './edge'
import {
  confirmController,
  confirmDetailParts,
  confirmIcon,
  isDestructive,
  type ConfirmAction,
  type ConfirmColor,
  type ConfirmEntry,
} from './confirm'

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
    const { confirmLabel, confirmColor, confirmVariant } = request.options
    return [{ label: confirmLabel ?? props.confirmLabel, value: true, color: confirmColor ?? color ?? 'primary', variant: confirmVariant }]
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
const icon = computed(() => options.value && confirmIcon(options.value))
const details = computed(() => options.value?.details?.map(confirmDetailParts) ?? [])

/** Into the dialog: Cancel for a destructive question, else the last (confirming) action. */
function placeFocus(event: Event) {
  const root = event.currentTarget instanceof Element ? event.currentTarget : document
  const target = root.querySelector<HTMLElement>('[data-confirm-autofocus]')
  if (!target) return
  event.preventDefault()
  target.focus()
}

// the description is in the body, not UModal's header, so the dialog is pointed at it by id: still its description
const descriptionId = useId()
const content = computed(() => ({
  'role': 'alertdialog',
  'data-confirm-dialog': '',
  'aria-describedby': options.value?.description ? descriptionId : undefined,
  'onOpenAutoFocus': placeFocus,
}))

/** The dialog's width for each `size`: the widths Buoy's confirm dialog had. */
const WIDTH = { sm: 'sm:max-w-md', md: 'sm:max-w-xl', lg: 'sm:max-w-3xl' } as const
const ui = computed(() => ({ content: WIDTH[options.value?.size ?? 'sm'] ?? WIDTH.sm, footer: 'justify-between gap-2' }))
</script>

<template>
  <ZModal
    :open="open"
    :title="options?.title"
    :color="edgeColor"
    :dismissible="options?.dismissible !== false"
    :content="content"
    :ui="ui"
    @update:open="(value: boolean) => { if (!value) dismiss() }"
    @after:leave="afterLeave"
  >
    <!-- Buoy's layout: the badge beside the description, and the details beneath, indented to the description's column
         (40px badge + 12px gap) whenever there is an icon. The badge shows only beside a description: with none, or
         with neither a description nor details (no body at all), there is no badge. -->
    <template v-if="options?.description || details.length" #body>
      <div class="flex flex-col gap-3">
        <div v-if="options?.description" class="flex items-start gap-3">
          <span v-if="icon" class="grid size-10 shrink-0 place-items-center rounded-full" :class="badge" :data-confirm-icon="icon">
            <UIcon :name="icon" class="size-5" aria-hidden="true" />
          </span>
          <p :id="descriptionId" class="text-sm text-toned" :class="{ 'pt-2': icon }" data-confirm-description>
            {{ options.description }}
          </p>
        </div>
        <!-- toned, not muted: muted on the elevated ground falls under 4.5:1 on some Forest schemes in light mode -->
        <ul v-if="details.length" class="flex flex-col gap-1.5 text-sm text-toned" :class="{ 'pl-13': icon }" data-confirm-details>
          <li v-for="(detail, i) in details" :key="i" class="rounded-md bg-elevated px-3 py-2">
            <template v-if="detail.title">
              <span class="block font-medium text-highlighted" data-confirm-detail-title>{{ detail.title }}</span>
              <span v-if="detail.text" class="block whitespace-pre-line text-toned" data-confirm-detail-text>{{ detail.text }}</span>
            </template>
            <template v-else>{{ detail.text }}</template>
          </li>
        </ul>
      </div>
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
      <div class="flex flex-wrap justify-end gap-2" data-confirm-actions>
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
      </div>
    </template>
  </ZModal>
</template>
