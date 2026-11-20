<script setup lang="ts">
/**
 * ZFileDropOverlay over the window (tests/file-drop.spec.ts drives it with DragEvents carrying a DataTransfer): images
 * and PDFs, several at once, with nested children to drag across, a field to hold focus, switches to unmount and
 * disable it, and a link to the scoped page for the navigation check. What the drop handed back is written out.
 */
const mounted = ref(true)
const disabled = ref(false)
const dropped = ref<string[]>([])
const rejected = ref<string[]>([])
const drop = useTemplateRef('drop')
const uploaded = ref<File[] | null>(null)
</script>

<template>
  <main class="mx-auto flex max-w-4xl flex-col gap-6 px-4 py-8">
    <section data-zone="cards" class="flex flex-col gap-3 rounded-md border border-default p-4">
      <div data-child="a" class="rounded-md bg-muted p-4">
        <p data-child="b" class="text-sm">A child, and <strong data-child="c">its child</strong>, to drag across.</p>
      </div>
      <UInput placeholder="Holds focus" class="max-w-sm" />
    </section>

    <div class="flex flex-wrap gap-4 text-sm">
      <USwitch v-model="mounted" label="Mounted" data-toggle="mounted" />
      <USwitch v-model="disabled" label="Disabled" data-toggle="disabled" />
      <NuxtLink to="/file-drop-region" data-leave class="underline">The scoped page</NuxtLink>
    </div>

    <p class="text-sm">dropped: <span data-testid="dropped">{{ dropped.join(', ') || 'none' }}</span></p>
    <p class="text-sm">rejected: <span data-testid="rejected">{{ rejected.join(', ') || 'none' }}</span></p>
    <p class="text-sm">visible: <span data-testid="visible">{{ drop?.visible ?? 'unmounted' }}</span></p>

    <!-- A drop zone of its own, as a modal's would be: with the overlay disabled, its drop must still land. -->
    <div data-zone="upload" class="max-w-sm">
      <UFileUpload v-model="uploaded" multiple label="Nuxt UI's own drop zone" />
    </div>
    <p class="text-sm">uploaded: <span data-testid="uploaded">{{ uploaded?.map((f) => f.name).join(', ') || 'none' }}</span></p>

    <ZFileDropOverlay
      v-if="mounted"
      ref="drop"
      accept="image/*,.pdf"
      multiple
      :disabled="disabled"
      label="Drop receipts to attach them"
      description="Images and PDFs"
      @drop="(files) => (dropped = files.map((f) => f.name))"
      @rejected="(files) => (rejected = files.map((r) => `${r.file.name} ${r.reason}`))"
    />
  </main>
</template>
