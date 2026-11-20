<script setup lang="ts">
/**
 * ZFileDropOverlay over the window (tests/file-drop.spec.ts drives it with DragEvents carrying a DataTransfer): images
 * and PDFs, several at once, with nested children to drag across, a field to hold focus, switches to unmount and
 * disable it, a UFileUpload of the page's own, and a link to the scoped page for the navigation check. What the drop
 * handed back is written out.
 */
const mounted = ref(true)
const disabled = ref(false)
const dropped = ref<string[]>([])
const rejected = ref<string[]>([])
const drop = useTemplateRef('drop')
const uploaded = ref<File[] | null>(null)
</script>

<template>
  <main class="mx-auto flex max-w-4xl flex-col gap-8 px-4 py-8">
    <header class="flex flex-col gap-2">
      <h1 class="text-xl font-semibold text-highlighted">ZFileDropOverlay, over the window</h1>
      <p class="text-sm text-muted">
        Drag images, PDFs or anything else from your desktop anywhere onto this page: an overlay covers the window while
        the drag is over it, and dropping hands the files back. This one takes images and PDFs, several at once. The
        readouts under "What the drop handed back" show what it emitted: <strong>Dropped</strong> lists the files it
        took, <strong>Rejected</strong> the ones it refused and why, and <strong>Overlay showing</strong> its exposed
        <code>visible</code>.
      </p>
    </header>

    <section class="flex flex-col gap-3">
      <h2 class="text-base font-semibold text-highlighted">Nested elements</h2>
      <p class="text-sm text-muted">Try this: drag a file slowly across the boxes below; the overlay stays up without flickering.</p>
      <div data-zone="cards" class="flex flex-col gap-3 rounded-md border border-default p-4">
        <div data-child="a" class="rounded-md bg-muted p-4">
          <p data-child="b" class="text-sm">A child, and <strong data-child="c">its child</strong>, to drag across.</p>
        </div>
        <UFormField label="A field that keeps focus" class="max-w-sm">
          <UInput placeholder="Holds focus" class="w-full" />
        </UFormField>
      </div>
    </section>

    <section class="flex flex-col gap-3">
      <h2 class="text-base font-semibold text-highlighted">Switches</h2>
      <p class="text-sm text-muted">Try this: turn Disabled on and drag a file over the page; no overlay shows, and the file doesn't open in the tab.</p>
      <div class="flex flex-wrap gap-4 text-sm">
        <USwitch v-model="mounted" label="Mounted" data-toggle="mounted" />
        <USwitch v-model="disabled" label="Disabled" data-toggle="disabled" />
        <NuxtLink to="/file-drop-region" data-leave class="underline">Go to the scoped page</NuxtLink>
      </div>
    </section>

    <section class="flex flex-col gap-1 text-sm">
      <h2 class="mb-2 text-base font-semibold text-highlighted">What the drop handed back</h2>
      <p>Dropped: <span data-testid="dropped">{{ dropped.join(', ') || 'none' }}</span></p>
      <p>Rejected: <span data-testid="rejected">{{ rejected.join(', ') || 'none' }}</span></p>
      <p>Overlay showing: <span data-testid="visible">{{ drop?.visible ?? 'unmounted' }}</span></p>
    </section>

    <section class="flex flex-col gap-3">
      <h2 class="text-base font-semibold text-highlighted">A drop zone of the page's own</h2>
      <p class="text-sm text-muted">Try this: turn Disabled on and drop a file on this box; Nuxt UI's UFileUpload still gets it.</p>
      <!-- With the overlay disabled, its drop must still land. -->
      <div data-zone="upload" class="max-w-sm">
        <UFileUpload v-model="uploaded" multiple label="Nuxt UI's own drop zone" />
      </div>
      <p class="text-sm">Uploaded: <span data-testid="uploaded">{{ uploaded?.map((f) => f.name).join(', ') || 'none' }}</span></p>
    </section>

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
