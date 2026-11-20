<script setup lang="ts">
const region = useTemplateRef<HTMLElement>('region')
const files = ref<File[]>([])
const refused = ref<RejectedFile[]>([])
</script>

<template>
  <div ref="region" class="flex w-full flex-col gap-2 rounded-md border border-dashed border-accented p-6 text-sm">
    <p class="text-muted">Drag images or PDFs from your desktop onto this box.</p>
    <p v-for="f in files" :key="f.name" class="text-default">{{ f.name }}</p>
    <p v-for="r in refused" :key="r.file.name" class="text-muted">{{ r.file.name }}: not an image or a PDF</p>
    <ZFileDropOverlay
      :target="region"
      accept="image/*,.pdf"
      multiple
      label="Drop to attach"
      icon="i-lucide-upload"
      description="Images and PDFs"
      @drop="(f) => (files = f)"
      @rejected="(r) => (refused = r)"
    />
  </div>
</template>
