<script setup lang="ts">
/**
 * Forest's colored edges on Nuxt UI's surfaces — Forest only, so it is not in the shared kitchen-sink specimens.
 * Cards and toasts take a LEFT edge; dialogs, slideovers and drawers a TOP edge. No color, no edge.
 */
const colors = ['primary', 'secondary', 'success', 'info', 'warning', 'error', 'neutral'] as const
type Color = (typeof colors)[number]

const overlayColor = ref<Color>('error')
const dialog = ref(false)
const slideover = ref(false)
const drawer = ref(false)

const toast = useToast()
const notify = (color: Color) => toast.add({ title: `${color[0]!.toUpperCase()}${color.slice(1)}`, description: 'A toast with its colored edge.', color })
</script>

<template>
  <KsSection id="edges" title="Colored edges" note="Forest's one addition to Nuxt UI's surfaces: a 3px edge in the surface's color — left on cards and toasts, top on dialogs, slideovers and drawers.">
    <KsRow label="cards">
      <div class="w-full grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <ZCard data-edge="none">
          <p class="font-semibold">No color</p>
          <p class="text-sm text-muted">A plain Nuxt UI card.</p>
        </ZCard>
        <ZCard v-for="c in colors" :key="c" :color="c" :data-edge="c">
          <p class="font-semibold capitalize">{{ c }}</p>
          <p class="text-sm text-muted">A card with the {{ c }} edge.</p>
        </ZCard>
      </div>
    </KsRow>

    <KsRow label="card with parts">
      <ZCard color="primary" class="w-full max-w-sm">
        <template #header><h3 class="font-semibold">Header</h3></template>
        <p class="text-sm text-muted">The edge spans header, body and footer.</p>
        <template #footer>
          <div class="flex justify-end gap-2">
            <UButton color="neutral" variant="ghost" size="sm">Cancel</UButton>
            <UButton size="sm">Save</UButton>
          </div>
        </template>
      </ZCard>
    </KsRow>

    <KsRow label="overlays">
      <USelect v-model="overlayColor" :items="[...colors]" class="w-36" aria-label="Overlay color" />
      <UButton color="neutral" variant="outline" data-open="dialog" @click="dialog = true">Dialog</UButton>
      <UButton color="neutral" variant="outline" data-open="slideover" @click="slideover = true">Slideover</UButton>
      <UButton color="neutral" variant="outline" data-open="drawer" @click="drawer = true">Drawer</UButton>
    </KsRow>

    <KsRow label="banners">
      <div class="w-full flex flex-col gap-2">
        <UAlert
          color="warning" variant="outline" orientation="horizontal" data-banner="warning"
          title="Storage near limit" description="8.6 of 10 GB used. Publishes are refused at 10 GB; installs keep working."
          :actions="[{ label: 'Upgrade', color: 'neutral', variant: 'outline' }]"
        />
        <UAlert color="error" variant="outline" data-banner="error" title="Over quota" description="Publishes are refused until you upgrade or remove versions." icon="i-lucide-octagon-x" />
        <UAlert color="primary" variant="outline" data-banner="primary" title="New feed available" description="Mirror an upstream registry without leaving your network." />
      </div>
    </KsRow>

    <KsRow label="striped variants">
      <div class="w-full grid sm:grid-cols-2 gap-2">
        <UAlert v-for="v in (['solid', 'soft', 'subtle', 'outline'] as const)" :key="v" color="info" :variant="v" :data-variant="v" :title="`${v}`" description="The striped edge on each Nuxt UI variant." />
      </div>
    </KsRow>

    <KsRow label="toasts">
      <UButton v-for="c in colors" :key="c" :color="c" variant="soft" :data-toast="c" @click="notify(c)">{{ c }}</UButton>
    </KsRow>

    <ZModal v-model:open="dialog" :color="overlayColor" title="Delete workspace?" description="This cannot be undone.">
      <template #body>
        <p class="text-sm text-muted">Every service, token and log in this workspace is removed.</p>
      </template>
      <template #footer>
        <div class="flex justify-end gap-2 w-full">
          <UButton color="neutral" variant="ghost" @click="dialog = false">Cancel</UButton>
          <UButton :color="overlayColor" @click="dialog = false">Confirm</UButton>
        </div>
      </template>
    </ZModal>

    <ZSlideover v-model:open="slideover" :color="overlayColor" title="Slideover" description="A side panel with its edge on top.">
      <template #body><p class="text-sm text-muted">Body content.</p></template>
    </ZSlideover>

    <ZDrawer v-model:open="drawer" :color="overlayColor" title="Drawer" description="A bottom sheet with its edge on top.">
      <template #body><p class="text-sm text-muted p-4">Body content.</p></template>
    </ZDrawer>
  </KsSection>
</template>
