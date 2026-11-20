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
 */
import type { PopoverProps } from '@nuxt/ui'
import { computed, useId, watch } from 'vue'
import type { ConfirmColor } from './confirm'

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
  /** Where the popover opens: UPopover's `content` (side, align, offsets). */
  content?: PopoverProps['content']
}>(), {
  question: 'Are you sure?',
  description: undefined,
  confirmLabel: 'Yes',
  cancelLabel: 'No',
  confirmColor: 'error',
  content: () => ({ side: 'bottom', align: 'start' }),
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
  <UPopover v-model:open="open" :content="contentProps">
    <UButton v-bind="$attrs">
      <template v-for="(_, name) in $slots" #[name]="scope">
        <slot :name="name" v-bind="scope ?? {}" />
      </template>
    </UButton>

    <template #content>
      <div class="flex max-w-xs flex-col gap-3 p-3" data-confirm-popover>
        <div class="flex flex-col gap-1">
          <p :id="questionId" class="text-sm font-semibold text-highlighted">{{ question }}</p>
          <p v-if="description" :id="descriptionId" class="text-xs text-muted">{{ description }}</p>
        </div>
        <div class="flex justify-end gap-2">
          <UButton size="xs" color="neutral" variant="outline" :label="cancelLabel" data-confirm-cancel @click="open = false" />
          <UButton size="xs" :color="confirmColor" :label="confirmLabel" data-confirm-action @click="confirm" />
        </div>
      </div>
    </template>
  </UPopover>
</template>
