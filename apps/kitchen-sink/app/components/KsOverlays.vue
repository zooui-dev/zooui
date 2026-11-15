<script setup lang="ts">
const modal = ref(false)
const slideover = ref(false)
const drawer = ref(false)
const palette = ref(false)

const menuItems = [
  [{ label: 'Profile', icon: 'i-lucide-user' }, { label: 'Settings', icon: 'i-lucide-settings', kbds: ['meta', ','] }],
  [{ label: 'Duplicate', icon: 'i-lucide-copy' }, { label: 'Delete', icon: 'i-lucide-trash-2', color: 'error' as const }],
]
const paletteGroups = [{
  id: 'actions',
  items: [
    { label: 'Open reviews', icon: 'i-lucide-git-pull-request' },
    { label: 'Add a machine', icon: 'i-lucide-server' },
    { label: 'Invite a member', icon: 'i-lucide-user-plus' },
  ],
}]
</script>

<template>
  <KsSection id="overlays" title="Overlays" note="The parts a hand-built system gets wrong: focus traps, escape, focus return, roving focus.">
    <KsRow label="modal / slideover / drawer">
      <UButton @click="modal = true">Modal</UButton>
      <UButton color="neutral" variant="outline" @click="slideover = true">Slideover</UButton>
      <UButton color="neutral" variant="outline" @click="drawer = true">Drawer</UButton>
      <UButton color="neutral" variant="outline" icon="i-lucide-search" @click="palette = true">Command palette</UButton>
    </KsRow>

    <KsRow label="menus">
      <UDropdownMenu :items="menuItems">
        <UButton color="neutral" variant="outline" trailing-icon="i-lucide-chevron-down">Dropdown</UButton>
      </UDropdownMenu>
      <UContextMenu :items="menuItems">
        <div class="h-10 px-4 flex items-center rounded-md border border-dashed border-default text-sm text-muted">Right-click me</div>
      </UContextMenu>
      <UPopover>
        <UButton color="neutral" variant="outline">Popover</UButton>
        <template #content>
          <div class="p-4 text-sm w-56">Popover content, with its own padding and shadow.</div>
        </template>
      </UPopover>
      <UTooltip text="A tooltip" :delay-duration="0">
        <UButton color="neutral" variant="ghost">Hover me</UButton>
      </UTooltip>
    </KsRow>

    <UModal v-model:open="modal" title="Delete workspace?" description="This cannot be undone.">
      <template #body>
        <p class="text-sm text-muted">Every service, token and log in this workspace is removed.</p>
      </template>
      <template #footer>
        <div class="flex justify-end gap-2 w-full">
          <UButton color="neutral" variant="ghost" @click="modal = false">Cancel</UButton>
          <UButton color="error" @click="modal = false">Delete</UButton>
        </div>
      </template>
    </UModal>

    <USlideover v-model:open="slideover" title="Slideover" description="Slides in from the side.">
      <template #body><p class="text-sm text-muted">Body content.</p></template>
    </USlideover>

    <UDrawer v-model:open="drawer" title="Drawer" description="Comes up from the bottom.">
      <template #body><p class="text-sm text-muted p-4">Body content.</p></template>
    </UDrawer>

    <UModal v-model:open="palette">
      <template #content>
        <UCommandPalette :groups="paletteGroups" placeholder="Search actions…" class="h-80" @update:open="palette = false" />
      </template>
    </UModal>
  </KsSection>
</template>
