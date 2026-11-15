<script setup lang="ts">
/**
 * nu-grid under Forest: the layer's `nuGrid` styling on nu-grid's own themes. Colors come from Forest through Nuxt
 * UI's tokens; geometry is each theme's own. Grouped, so the group band and its colored edge show.
 */
const rows = [
  { id: 'a1', package: '@zooui/nuxt', owner: 'design', versions: 42, size: 1.84 },
  { id: 'a2', package: '@acme/layer-foundation', owner: 'platform', versions: 17, size: 0.62 },
  { id: 'a3', package: '@nu-grid/nuxt', owner: 'platform', versions: 23, size: 1.23 },
  { id: 'a4', package: 'acme-ui', owner: 'design', versions: 9, size: 0.41 },
  { id: 'a5', package: '@zooui/nuxt', owner: 'design', versions: 1, size: 0.09 },
]
const columns = [
  { accessorKey: 'package', header: 'Package' },
  { accessorKey: 'owner', header: 'Owner' },
  { accessorKey: 'versions', header: 'Versions' },
  { accessorKey: 'size', header: 'Size (MB)' },
]
</script>

<template>
  <KsSection id="grid" title="Grid" note="nu-grid on its own themes, with Forest's colors through Nuxt UI's tokens. Group bands stay neutral; the accent is a 3px leading edge.">
    <KsRow label="default">
      <div class="w-full h-64" data-grid="default">
        <NuGrid :data="rows" :columns="columns" row-id="id" />
      </div>
    </KsRow>
    <KsRow label="default · grouped">
      <div class="w-full h-80" data-grid="default-grouped">
        <NuGrid :data="rows" :columns="columns" row-id="id" :grouping="['owner']" :layout="{ mode: 'group' }" />
      </div>
    </KsRow>
    <KsRow label="compact · grouped">
      <div class="w-full h-64" data-grid="compact-grouped">
        <NuGrid :data="rows" :columns="columns" row-id="id" theme="compact" :grouping="['owner']" :layout="{ mode: 'group' }" />
      </div>
    </KsRow>
  </KsSection>
</template>
