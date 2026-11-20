<script setup lang="ts">
/**
 * ZFileDropOverlay scoped to one region by a template ref (tests/file-drop.spec.ts): one CSV at a time, the overlay
 * over the region only, and the rest of the page left alone. The ref is null on the first render, so this also
 * covers a target that arrives after mount.
 */
const region = useTemplateRef<HTMLElement>('region')
const dropped = ref<string[]>([])
const rejected = ref<string[]>([])
</script>

<template>
  <main class="mx-auto flex max-w-4xl flex-col gap-6 px-4 py-8">
    <p data-zone="outside" class="text-sm">Outside the region.</p>
    <div ref="region" data-zone="region" class="h-64 rounded-md border border-dashed border-accented p-4">
      <p data-child="inside" class="text-sm">Drop a CSV in this region.</p>
    </div>
    <p class="text-sm">dropped: <span data-testid="dropped">{{ dropped.join(', ') || 'none' }}</span></p>
    <p class="text-sm">rejected: <span data-testid="rejected">{{ rejected.join(', ') || 'none' }}</span></p>
    <ZFileDropOverlay
      :target="region"
      accept=".csv,text/csv"
      label="Drop a CSV to import it"
      @drop="(files) => (dropped = files.map((f) => f.name))"
      @rejected="(files) => (rejected = files.map((r) => `${r.file.name} ${r.reason}`))"
    />
  </main>
</template>
