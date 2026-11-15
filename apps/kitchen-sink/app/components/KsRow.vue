<script setup lang="ts">
/**
 * A labeled row of specimens: the label names the variant axis being shown (SIZES, COLORS, DEFAULTS, ...), and
 * the slot holds the specimens themselves, wrapped side by side. It is the layout every section on the kitchen
 * sink and forest pages is built from.
 *
 * The `Ks` prefix is "kitchen sink": this is the kitchen sink's own component, not a Zoo UI one (nothing here is
 * published). The forest app does not copy it; it registers the kitchen sink's components directory as a source
 * (see apps/forest/nuxt.config.ts), so both pages share one `KsRow` and the name stays what that source says.
 * Renaming it would touch every section in both apps for no behavioral change.
 */
defineProps<{ label: string }>()
</script>

<template>
  <div class="flex flex-col sm:flex-row sm:items-start gap-2 sm:gap-4">
    <span class="sm:w-36 shrink-0 pt-1.5 text-xs font-medium uppercase tracking-wide text-dimmed">{{ label }}</span>
    <!-- flex-1, not shrink-to-fit: specimens that size themselves with w-full (progress, skeleton, table)
         contribute no intrinsic width, so an auto-sized row collapsed them to 0px wide.
         Items center (mixed-size buttons, badges, avatars) except form fields, which top-align so their
         labels and inputs line up whatever sits under them (help, error, readout or nothing). -->
    <div class="flex-1 min-w-0 flex flex-wrap items-center gap-2 [&>[data-slot=root][data-orientation]:has(>[data-slot=wrapper])]:self-start"><slot /></div>
  </div>
</template>
