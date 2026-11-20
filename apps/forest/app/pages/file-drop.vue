<script setup lang="ts">
/** ZFileDropOverlay on Forest (tests/file-drop.spec.ts): images and PDFs, several at once, and what the drop handed back. */
const dropped = ref<string[]>([])
const rejected = ref<string[]>([])
const drop = useTemplateRef('drop')
</script>

<template>
  <main class="mx-auto flex max-w-4xl flex-col gap-8 px-4 py-8">
    <header class="flex flex-col gap-2">
      <h1 class="text-xl font-semibold text-highlighted">ZFileDropOverlay on Forest</h1>
      <p class="text-sm text-muted">
        The window-level overlay in Forest's colors: drag files anywhere on the page and it covers the window. It takes
        images and PDFs, several at once. <strong>Dropped</strong> lists what it took, <strong>Rejected</strong> what it
        refused and why, and <strong>Overlay showing</strong> its exposed <code>visible</code>.
      </p>
    </header>

    <section data-zone="cards" class="flex flex-col gap-2 rounded-md border border-default p-4">
      <h2 class="text-base font-semibold text-highlighted">Drop here, or anywhere</h2>
      <p data-child="b" class="text-sm text-muted">Try this: drag receipts anywhere on the page, then switch the scheme or dark mode and drag again.</p>
    </section>

    <section class="flex flex-col gap-1 text-sm">
      <h2 class="mb-2 text-base font-semibold text-highlighted">What the drop handed back</h2>
      <p>Dropped: <span data-testid="dropped">{{ dropped.join(', ') || 'none' }}</span></p>
      <p>Rejected: <span data-testid="rejected">{{ rejected.join(', ') || 'none' }}</span></p>
      <p>Overlay showing: <span data-testid="visible">{{ drop?.visible ?? 'unmounted' }}</span></p>
    </section>
    <ZFileDropOverlay
      ref="drop"
      accept="image/*,.pdf"
      multiple
      label="Drop receipts to attach them"
      icon="i-lucide-upload"
      description="Images and PDFs"
      @drop="(files) => (dropped = files.map((f) => f.name))"
      @rejected="(files) => (rejected = files.map((r) => `${r.file.name} ${r.reason}`))"
    />
  </main>
</template>
