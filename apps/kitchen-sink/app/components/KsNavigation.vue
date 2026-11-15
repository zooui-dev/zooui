<script setup lang="ts">
const page = ref(1)

const tabs = [
  { label: 'Overview', icon: 'i-lucide-layout-dashboard', content: 'The overview tab, with the default underline styling.' },
  { label: 'Activity', icon: 'i-lucide-activity', content: 'The activity tab.' },
  { label: 'Settings', icon: 'i-lucide-settings', content: 'The settings tab.' },
]
const breadcrumb = [
  { label: 'Workspace', icon: 'i-lucide-home', to: '#navigation' },
  { label: 'Repositories', to: '#navigation' },
  { label: 'northstar/api' },
]
const menu = [
  [{ label: 'Attention', icon: 'i-lucide-inbox', badge: '7' }, { label: 'Reviews', icon: 'i-lucide-git-pull-request' }],
  [{ label: 'Fleet', icon: 'i-lucide-server' }, { label: 'Settings', icon: 'i-lucide-settings' }],
]
const steps = [
  { title: 'Workspace', description: 'Name it', icon: 'i-lucide-building' },
  { title: 'Products', description: 'Pick them', icon: 'i-lucide-package' },
  { title: 'Install', description: 'Connect GitHub', icon: 'i-lucide-github' },
]
</script>

<template>
  <KsSection id="navigation" title="Navigation" note="Tabs, menus and paging — the shipped look, including the default pill tabs.">
    <KsRow label="tabs">
      <div class="w-full max-w-xl"><UTabs :items="tabs" /></div>
    </KsRow>
    <KsRow label="tabs · link">
      <div class="w-full max-w-xl"><UTabs :items="tabs" variant="link" /></div>
    </KsRow>

    <KsRow label="breadcrumb">
      <UBreadcrumb :items="breadcrumb" />
    </KsRow>

    <KsRow label="navigation menu">
      <div class="w-full max-w-xl flex flex-col gap-4">
        <UNavigationMenu :items="menu" />
        <UNavigationMenu :items="menu" orientation="vertical" class="w-56 border border-default rounded-md p-1" />
      </div>
    </KsRow>

    <KsRow label="stepper">
      <div class="w-full max-w-xl"><UStepper :items="steps" /></div>
    </KsRow>

    <KsRow label="pagination">
      <UPagination v-model:page="page" :total="120" :items-per-page="10" />
    </KsRow>
  </KsSection>
</template>
