<script setup lang="ts">
/**
 * The shown-once moment: a secret (an API token, say) displayed once after it is created. Zoo UI's code surface holds
 * the token — its copy button, the token marked and selectable in one click — under a `[ token · name · shown once ]`
 * kicker, with Zoo UI's banner (UAlert outline, warning) saying it will not be shown again. With `require-ack`, a
 * button acknowledges it has been saved: the secret then blurs and goes inert, out of reach of focus and readers.
 */
import { tokenReveal, cx } from "./recipes";

withDefaults(defineProps<{
  /** the secret, shown in full */
  token: string;
  /** the token's name, in the kicker */
  name?: string;
  /** show the acknowledgment button; the parent usually moves on when it emits `ack` */
  requireAck?: boolean;
  ackLabel?: string;
  /** the banner's title; the default slot replaces its description */
  title?: string;
}>(), { name: "default", requireAck: false, ackLabel: "I have saved it", title: "You won't see this token again" });

defineSlots<{
  /** the warning's description: what the token grants and what to do if it is lost */
  default?: () => unknown;
  /** more actions beside the acknowledgment, e.g. a "Done" link */
  actions?: () => unknown;
}>();

const emit = defineEmits<{
  /** the token reached the clipboard (never on a failed copy) */
  copy: [token: string];
  /** the acknowledgment button was pressed; emitted once */
  ack: [];
}>();

const labelId = useId();
const acknowledged = ref(false);

function ack() {
  if (acknowledged.value) return;
  acknowledged.value = true;
  emit("ack");
}
</script>

<template>
  <section :class="tokenReveal.root" :aria-labelledby="labelId">
    <ZKicker :id="labelId">token · {{ name }} · shown once</ZKicker>
    <div :class="cx(tokenReveal.secret, acknowledged && tokenReveal.hidden)" :inert="acknowledged" data-slot="secret">
      <ZCodeBlock variant="block" :code="token" :token="token" @copy="emit('copy', $event)" />
    </div>
    <UAlert color="warning" variant="outline" icon="i-lucide-triangle-alert" :title="title">
      <template #description>
        <slot>Copy it now and keep it somewhere safe. It is not stored in a recoverable form: if you lose it, revoke it and create another.</slot>
      </template>
    </UAlert>
    <div v-if="requireAck || $slots.actions" :class="tokenReveal.actions">
      <UButton v-if="requireAck" color="primary" :label="ackLabel" :icon="acknowledged ? 'i-lucide-check' : undefined" @click="ack" />
      <slot name="actions" />
    </div>
  </section>
</template>
