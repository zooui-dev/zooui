<script setup lang="ts">
/** ZFileDropOverlay on Forest (tests/file-drop.spec.ts): images and PDFs, several at once, and what the drop handed back. */
const dropped = ref<string[]>([])
const rejected = ref<string[]>([])
const drop = useTemplateRef('drop')
</script>

<template>
  <main class="mx-auto flex max-w-4xl flex-col gap-6 px-4 py-8">
    <section data-zone="cards" class="rounded-md border border-default p-4">
      <p data-child="b" class="text-sm">Drag receipts anywhere on the page.</p>
    </section>
    <p class="text-sm">dropped: <span data-testid="dropped">{{ dropped.join(', ') || 'none' }}</span></p>
    <p class="text-sm">rejected: <span data-testid="rejected">{{ rejected.join(', ') || 'none' }}</span></p>
    <p class="text-sm">visible: <span data-testid="visible">{{ drop?.visible ?? 'unmounted' }}</span></p>
    <ZFileDropOverlay
      ref="drop"
      accept="image/*,.pdf"
      multiple
      label="Drop receipts to attach them"
      description="Images and PDFs"
      @drop="(files) => (dropped = files.map((f) => f.name))"
      @rejected="(files) => (rejected = files.map((r) => `${r.file.name} ${r.reason}`))"
    />
  </main>
</template>
