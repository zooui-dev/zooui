<script setup lang="ts">
/**
 * An ecosystem (a package manager) as a two-letter monogram tile, told apart by its corner shape rather than brand
 * color, so it reads at 20px and in grayscale. Known ecosystems are in ./ecosystems.ts; any other is drawn from
 * `label` / `monogram` / `shape`. The tile is an image named by its label — or decorative, when `with-label` shows
 * the name beside it. `disabled` dashes it: not available yet.
 */
import { eco, cx } from "./recipes";
import { ecosystem as resolve, type EcosystemShape, type KnownEcosystem } from "./ecosystems";

const props = withDefaults(defineProps<{
  ecosystem: KnownEcosystem | (string & {});
  size?: keyof typeof eco.size;
  withLabel?: boolean;
  disabled?: boolean;
  /** said after the label when disabled: "npm · soon" */
  disabledNote?: string;
  /** override, or define an ecosystem the layer does not know */
  label?: string;
  monogram?: string;
  shape?: EcosystemShape;
}>(), { size: "sm", withLabel: false, disabled: false, disabledNote: "soon" });

const e = computed(() => resolve(props.ecosystem, { label: props.label, monogram: props.monogram, shape: props.shape }));
const state = computed(() => (props.disabled ? "disabled" : "enabled"));
const name = computed(() => (props.disabled ? `${e.value.label} (${props.disabledNote})` : e.value.label));
</script>

<template>
  <span v-if="withLabel" :class="eco.wrap">
    <span :class="cx(eco.base, eco.size[size], eco.state[state], eco.shape[e.shape])" :data-eco="ecosystem" aria-hidden="true">{{ e.monogram }}</span>
    <span :class="eco.label[state]">{{ e.label }}<template v-if="disabled"> · {{ disabledNote }}</template></span>
  </span>
  <span
    v-else
    :class="cx(eco.base, eco.size[size], eco.state[state], eco.shape[e.shape])" :data-eco="ecosystem"
    role="img" :aria-label="name" :title="name"
  ><span aria-hidden="true">{{ e.monogram }}</span></span>
</template>
