<script setup lang="ts">
// A 2x2 PNG, as a stored file's thumbnail and the bytes of a photo just added.
const PNG = 'iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAIAAAD91JpzAAAAEElEQVR4nGPgW/oSiBggFAApsgZx/T7YngAAAABJRU5ErkJggg=='

const files = ref<FileListItem[]>([
  { id: 1, name: 'site-photo.png', size: 245_000, type: 'image/png', thumbnail: `data:image/png;base64,${PNG}` },
  { id: 2, name: 'project-brief.pdf', size: 1_830_000, type: 'application/pdf' },
])
// A File is made in the browser, not in the server's render.
onMounted(() => {
  files.value = [...files.value, new File([Uint8Array.from(atob(PNG), (c) => c.charCodeAt(0))], 'sketch.png', { type: 'image/png' })]
})
const isNew = (item: FileListItem) => item instanceof File
const selected = ref<string[]>([])
function select(name: string, on: boolean | 'indeterminate') {
  selected.value = on === true ? [...selected.value, name] : selected.value.filter((n) => n !== name)
}
async function remove(item: FileListItem) {
  if (!isNew(item)) await new Promise((resolve) => setTimeout(resolve, 800))
  files.value = files.value.filter((f) => f !== item)
}
</script>

<template>
  <div class="w-full max-w-sm">
    <ZFileList :items="files" :remove="remove" preview>
      <template #leading="{ item, removing }">
        <UCheckbox :model-value="selected.includes(item.name)" :disabled="removing" :aria-label="`Select ${item.name}`" @update:model-value="(on) => select(item.name, on)" />
      </template>
      <template #trailing="{ item }">
        <UBadge size="sm" variant="subtle" :color="isNew(item) ? 'primary' : 'neutral'" :label="isNew(item) ? 'New' : 'Sent'" />
      </template>
    </ZFileList>
  </div>
</template>
