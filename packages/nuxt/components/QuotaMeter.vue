<script setup lang="ts">
import { meter, cx } from "./recipes";

const props = withDefaults(defineProps<{
  used: number; quota: number; unit?: string;
  size?: "md" | "lg"; showValue?: boolean;
  /** 0–1; amber from here, red + hatched at 100% */
  warnAt?: number;
  format?: (used: number, quota: number) => string;
}>(), { unit: "GB", size: "md", showValue: true, warnAt: 0.8 });

const ratio = computed(() => (props.quota > 0 ? props.used / props.quota : 0));
const level = computed<"ok" | "warn" | "over">(() =>
  ratio.value >= 1 ? "over" : ratio.value >= props.warnAt ? "warn" : "ok");
const pct = computed(() => Math.min(100, Math.round(ratio.value * 100)));
const label = computed(() => props.format
  ? props.format(props.used, props.quota)
  : `${+props.used.toFixed(props.used < 10 ? 1 : 0)} / ${props.quota} ${props.unit}`);
</script>

<template>
  <span
    :class="cx(meter.base, meter.size[size])"
    role="meter" :aria-valuemin="0" :aria-valuemax="quota" :aria-valuenow="used" :aria-label="label"
  >
    <span :class="cx(meter.track, meter.trackSize[size])">
      <span :class="cx(meter.fill, meter.level[level])" :style="{ width: pct + '%' }" />
      <span v-if="warnAt < 1" :class="meter.mark" :style="{ left: warnAt * 100 + '%' }" />
    </span>
    <span v-if="showValue" :class="cx(meter.value, meter.valueLevel[level])">{{ label }}</span>
  </span>
</template>
