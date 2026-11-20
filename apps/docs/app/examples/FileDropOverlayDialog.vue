<script setup lang="ts">
const ACCEPT = 'application/pdf,.csv,image/*'
const toast = useToast()
const dialog = useTemplateRef<HTMLElement>('dialog')

// What the transfer already holds (from the server), then what is being added.
const stored = ref<FileListItem[]>([{ id: 'f-1', name: 'engagement-letter.pdf', size: 245_000, type: 'application/pdf' }])
const added = ref<File[]>([])

function report(rejected: RejectedFile[]) {
  toast.add({ title: 'Not attached', description: `${rejected.map((r) => r.file.name).join(', ')}: only PDFs, CSVs and images.`, color: 'error' })
}
/** Dropped or browsed, every file goes through the one rule. */
function add(files: File[]) {
  const { accepted, rejected } = sortDroppedFiles(files, { accept: ACCEPT, multiple: true })
  added.value = [...added.value, ...accepted]
  if (rejected.length) report(rejected)
}
async function remove(item: FileListItem) {
  if (item instanceof File) added.value = added.value.filter((f) => f !== item)
  else {
    await new Promise((resolve) => setTimeout(resolve, 800)) // the server's delete
    stored.value = stored.value.filter((f) => f !== item)
  }
}
</script>

<template>
  <ZModal title="Edit transfer" description="Send files to a client">
    <UButton label="Edit transfer" color="neutral" variant="outline" />
    <template #content="{ close }">
      <div ref="dialog" class="flex flex-col gap-4 rounded-[inherit] p-6">
        <div class="flex items-center justify-between">
          <h3 class="text-base font-semibold text-highlighted">Edit transfer</h3>
          <UButton icon="i-lucide-x" variant="ghost" color="neutral" aria-label="Close" @click="close" />
        </div>
        <UFormField label="Files">
          <div class="flex flex-col gap-2">
            <ZFileList :items="[...stored, ...added]" :remove="remove" />
            <UFileUpload
              :model-value="null"
              multiple
              :accept="ACCEPT"
              :preview="false"
              label="Drop files or browse"
              description="PDFs, CSVs and images"
              class="min-h-28 w-full"
              @update:model-value="(f) => f && add(f)"
            />
          </div>
        </UFormField>
        <ZFileDropOverlay :target="dialog" :accept="ACCEPT" multiple label="Drop files to attach them" @drop="add" @rejected="report" />
      </div>
    </template>
  </ZModal>
</template>
