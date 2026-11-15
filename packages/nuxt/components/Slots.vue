<script setup lang="ts">
/**
 * One chip per slot of capacity, each NAMED: "slot 1 · free", "slot 2 · build 4812". An open slot is a solid
 * primary badge (the accent, with ground-colored text in dark); a held one is an outline neutral badge saying what
 * holds it. Blank colored bars read as empty tags, so a chip always carries its text. Nuxt UI's UBadge as it ships
 * (the Forest theme sets badges in its mono face); the list is labeled for assistive tech by `label`.
 */
defineProps<{
  /** In display order. `label` is the chip's text; `available` marks an open slot; `title` is an optional tooltip. */
  slots: { label: string; available: boolean; title?: string }[]
  /** What the group is, for assistive tech: "Linux VMs: 1 of 4 free". */
  label?: string
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
}>()
</script>

<template>
  <ul class="flex flex-wrap gap-1.5 m-0 p-0 list-none" :aria-label="label">
    <li v-for="(slot, i) in slots" :key="i" class="flex">
      <UBadge
        :label="slot.label" :title="slot.title" :size="size"
        :color="slot.available ? 'primary' : 'neutral'" :variant="slot.available ? 'solid' : 'outline'"
        :data-available="slot.available ? 'true' : 'false'"
      />
    </li>
  </ul>
</template>
