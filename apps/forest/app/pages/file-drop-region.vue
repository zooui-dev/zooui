<script setup lang="ts">
/**
 * ZFileDropOverlay contained in one region by a template ref (tests/file-pages.spec.ts): one CSV at a time, the overlay
 * drawn inside the region only, and the rest of the page left alone. The ref is null on the first render, so this also
 * covers a target that arrives after mount.
 */
const region = useTemplateRef<HTMLElement>('region')
const dropped = ref<string[]>([])
const rejected = ref<string[]>([])
</script>

<template>
  <main class="mx-auto flex max-w-4xl flex-col gap-8 px-4 py-8">
    <header class="flex flex-col gap-2">
      <h2 class="text-xl font-semibold text-highlighted">ZFileDropOverlay, contained in a region</h2>
      <p class="text-sm text-muted">
        With <code>target</code>, the overlay takes drops in one element only and is drawn inside it. This region takes
        one CSV at a time. <strong>Dropped</strong> lists the file it took; <strong>Rejected</strong> the ones it
        refused and why (<code>accept</code> for the wrong type, <code>multiple</code> for a second CSV).
      </p>
    </header>

    <section class="flex flex-col gap-3">
      <h3 class="text-base font-semibold text-highlighted">Outside the region</h3>
      <p data-zone="outside" class="text-sm text-muted">Try this: drag a file over this line; nothing happens here.</p>
    </section>

    <section class="flex flex-col gap-3">
      <h3 class="text-base font-semibold text-highlighted">The region</h3>
      <p class="text-sm text-muted">Try this: drag two CSVs and an image onto the box; the first CSV is taken.</p>
      <div ref="region" data-zone="region" class="h-64 rounded-md border border-dashed border-accented p-4">
        <p data-child="inside" class="text-sm">Drop a CSV in this region.</p>
      </div>
    </section>

    <section class="flex flex-col gap-1 text-sm">
      <h3 class="mb-2 text-base font-semibold text-highlighted">What the drop handed back</h3>
      <p>Dropped: <span data-testid="dropped">{{ dropped.join(', ') || 'none' }}</span></p>
      <p>Rejected: <span data-testid="rejected">{{ rejected.join(', ') || 'none' }}</span></p>
    </section>

    <ZFileDropOverlay
      :target="region"
      accept=".csv,text/csv"
      label="Drop a CSV to import it"
      @drop="(files) => (dropped = files.map((f) => f.name))"
      @rejected="(files) => (rejected = files.map((r) => `${r.file.name} ${r.reason}`))"
    />
  </main>
</template>
