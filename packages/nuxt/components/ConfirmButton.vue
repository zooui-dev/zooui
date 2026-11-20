<script setup lang="ts">
/**
 * A button that asks before it acts: a click opens "Are you sure?" in a UPopover beside it, and `confirm` is emitted
 * only when that is answered yes. No, Escape and a click outside close it and emit `cancel`.
 *
 *   <ZConfirmButton label="Remove" icon="i-lucide-trash-2" color="error" variant="ghost" @confirm="remove(row)" />
 *
 * Every UButton prop, attribute and slot passes straight through to the button; only the question's own words and
 * colors are props here. Focus goes to No when the question opens, so Enter doesn't confirm by accident, and back to
 * the button when it closes. The popover is a `dialog` named by the button, as reka names it, and described by the
 * question and its description. For a question that needs more than a line, use useConfirm() and <ZConfirmDialog>.
 *
 * `confirm-enabled` false skips the question: it is then the plain UButton, and a click emits `confirm` at once, for
 * a caller that asks only sometimes (a row with nothing in it, say).
 */
import type { PopoverProps } from '@nuxt/ui'
import { computed, useId, watch } from 'vue'
import { CONFIRM_ERROR_ICON, type ConfirmColor, type ConfirmVariant } from './confirm'

defineOptions({ inheritAttrs: false })

const props = withDefaults(defineProps<{
  /** The question the popover asks. */
  question?: string
  /** A line under the question saying what happens. */
  description?: string
  /** The confirming button's label. */
  confirmLabel?: string
  /** The declining button's label. */
  cancelLabel?: string
  /** The confirming button's color. */
  confirmColor?: ConfirmColor
  /** The confirming button's variant. */
  confirmVariant?: ConfirmVariant
  /** An icon before the question; `false` for none. */
  questionIcon?: string | false
  /** Whether to ask at all. False: a plain button whose click emits `confirm` at once. */
  confirmEnabled?: boolean
  /** Where the popover opens: UPopover's `content` (side, align, offsets). */
  content?: PopoverProps['content']
  /** UPopover's arrow pointing at the button: its width and height, or `false` for none. */
  arrow?: PopoverProps['arrow']
}>(), {
  question: 'Are you sure?',
  description: undefined,
  confirmLabel: 'Yes',
  cancelLabel: 'No',
  confirmColor: 'error',
  confirmVariant: 'outline',
  questionIcon: CONFIRM_ERROR_ICON,
  confirmEnabled: true,
  content: () => ({ side: 'bottom', align: 'start' }),
  arrow: () => ({ width: 16, height: 8 }),
})

const emit = defineEmits<{
  /** The question was answered yes. */
  confirm: []
  /** The question was answered no, or dismissed with Escape or a click outside. */
  cancel: []
}>()

/** Whether the question is showing; `v-model:open` to open or close it from outside. */
const open = defineModel<boolean>('open', { default: false })

const questionId = useId()
const descriptionId = useId()

// `cancel` for every way the popover closes except yes: No, Escape, a click outside, `open` set false from outside
let confirmed = false
watch(open, (now) => {
  if (now) confirmed = false
  else if (!confirmed) emit('cancel')
})

// asking turned off while the question is open: close it (a cancel), so it doesn't reappear when asking comes back
watch(() => props.confirmEnabled, (on) => { if (!on) open.value = false })

function confirm() {
  if (!open.value) return
  confirmed = true
  open.value = false
  emit('confirm')
}

// reka names the popover after its trigger ("Remove row"), so the question and its line are its description
const contentProps = computed(() => ({
  ...props.content,
  'aria-describedby': props.description ? `${questionId} ${descriptionId}` : questionId,
}))
</script>

<template>
  <UButton v-if="!confirmEnabled" v-bind="$attrs" @click="emit('confirm')">
    <template v-for="(_, name) in $slots" #[name]="scope">
      <slot :name="name" v-bind="scope ?? {}" />
    </template>
  </UButton>
  <UPopover v-else v-model:open="open" :content="contentProps" :arrow="arrow">
    <UButton v-bind="$attrs">
      <template v-for="(_, name) in $slots" #[name]="scope">
        <slot :name="name" v-bind="scope ?? {}" />
      </template>
    </UButton>

    <template #content>
      <div class="flex flex-col gap-4 p-3" data-confirm-popover>
        <div class="flex items-center gap-4">
          <span v-if="questionIcon" class="flex shrink-0" aria-hidden="true" :data-confirm-question-icon="questionIcon">
            <UIcon :name="questionIcon" class="size-6" />
          </span>
          <div class="flex flex-col gap-2">
            <p :id="questionId" class="text-sm font-bold text-highlighted" data-confirm-question>{{ question }}</p>
            <p v-if="description" :id="descriptionId" class="text-xs" data-confirm-description>{{ description }}</p>
          </div>
        </div>
        <div class="flex items-center justify-end gap-3">
          <UButton size="xs" color="neutral" variant="outline" :label="cancelLabel" data-confirm-cancel @click="open = false" />
          <UButton size="xs" :color="confirmColor" :variant="confirmVariant" :label="confirmLabel" data-confirm-action @click="confirm" />
        </div>
      </div>
    </template>
  </UPopover>
</template>
