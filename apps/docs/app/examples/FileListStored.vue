<script setup lang="ts">
const files = ref<FileListItem[]>([
  { id: 1, name: 'engagement-letter.pdf', size: 245_000, type: 'application/pdf' },
  { id: 2, name: 'ledger-2025.xlsx', size: 1_830_000, type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' },
  new File(['x'.repeat(48_000)], 'receipt.png', { type: 'image/png' }),
])

// A stored file is deleted on the server; the row shows a spinner until it answers.
async function remove(item: FileListItem) {
  if (!(item instanceof File)) await new Promise((resolve) => setTimeout(resolve, 800))
  files.value = files.value.filter((f) => f !== item)
}
</script>

<template>
  <div class="w-full max-w-sm">
    <ZFileList :items="files" :remove="remove" />
  </div>
</template>
