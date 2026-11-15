<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui'

const colors = ['primary', 'secondary', 'success', 'info', 'warning', 'error', 'neutral'] as const

type Row = { id: number; repo: string; status: string; reviewers: number; cost: string }
const rows: Row[] = [
  { id: 248, repo: 'northstar/api', status: 'passing', reviewers: 3, cost: '$1.12' },
  { id: 251, repo: 'northstar/web', status: 'running', reviewers: 2, cost: '—' },
  { id: 233, repo: 'northstar/mobile', status: 'failed', reviewers: 1, cost: '$0.83' },
]
const columns: TableColumn<Row>[] = [
  { accessorKey: 'id', header: '#' },
  { accessorKey: 'repo', header: 'Repository' },
  { accessorKey: 'status', header: 'Status' },
  { accessorKey: 'reviewers', header: 'Reviewers' },
  { accessorKey: 'cost', header: 'Cost' },
]

const progress = ref(60)
const accordion = [
  { label: 'What is this page for?', content: 'It is the untouched Nuxt UI baseline that Zoo UI starts from.' },
  { label: 'Why no theme here?', content: 'Because the point is to see what the defaults give us before anything is overridden.' },
]
const timeline = [
  { date: '14:02', title: 'Webhook received', description: 'Pull request opened', icon: 'i-lucide-inbox' },
  { date: '14:03', title: 'Reviewers requested', description: '3 reviewers', icon: 'i-lucide-users' },
  { date: '14:04', title: 'Verdict', description: 'Human ready', icon: 'i-lucide-check' },
]
</script>

<template>
  <KsSection id="data" title="Data display" note="Badges, avatars, meters and the table, in the shipped theme.">
    <KsRow label="badge solid">
      <UBadge v-for="c in colors" :key="c" :color="c">{{ c }}</UBadge>
    </KsRow>
    <KsRow label="badge soft">
      <UBadge v-for="c in colors" :key="c" :color="c" variant="soft">{{ c }}</UBadge>
    </KsRow>
    <KsRow label="badge outline">
      <UBadge v-for="c in colors" :key="c" :color="c" variant="outline">{{ c }}</UBadge>
    </KsRow>

    <KsRow label="avatar + chip">
      <UAvatar src="https://github.com/nuxt.png" alt="Nuxt" />
      <UAvatar text="JD" />
      <UAvatar icon="i-lucide-user" />
      <UAvatarGroup>
        <UAvatar text="JD" />
        <UAvatar text="DO" />
        <UAvatar text="RK" />
      </UAvatarGroup>
      <UChip color="success" inset>
        <UAvatar text="ON" />
      </UChip>
    </KsRow>

    <KsRow label="progress">
      <div class="w-full max-w-sm flex flex-col gap-3">
        <UProgress v-model="progress" />
        <UProgress v-model="progress" color="success" />
        <UProgress animation="carousel" />
      </div>
    </KsRow>

    <KsRow label="skeleton">
      <div class="w-full max-w-sm flex items-center gap-3">
        <USkeleton class="size-10 rounded-full" />
        <div class="flex-1 flex flex-col gap-2">
          <USkeleton class="h-4 w-3/4" />
          <USkeleton class="h-4 w-1/2" />
        </div>
      </div>
    </KsRow>

    <KsRow label="table">
      <div class="w-full"><UTable :data="rows" :columns="columns" /></div>
    </KsRow>

    <KsRow label="card">
      <UCard class="w-full max-w-sm">
        <template #header><h3 class="font-semibold">Card</h3></template>
        <p class="text-sm text-muted">Body text inside the default card.</p>
        <template #footer>
          <div class="flex justify-end gap-2">
            <UButton color="neutral" variant="ghost" size="sm">Cancel</UButton>
            <UButton size="sm">Save</UButton>
          </div>
        </template>
      </UCard>
    </KsRow>

    <KsRow label="accordion">
      <div class="w-full max-w-lg"><UAccordion :items="accordion" /></div>
    </KsRow>

    <KsRow label="collapsible">
      <UCollapsible class="w-full max-w-lg flex flex-col gap-2">
        <UButton color="neutral" variant="outline" trailing-icon="i-lucide-chevron-down" block>Toggle details</UButton>
        <template #content>
          <div class="rounded-md border border-default p-3 text-sm text-muted">Collapsible content.</div>
        </template>
      </UCollapsible>
    </KsRow>

    <KsRow label="timeline">
      <div class="w-full max-w-lg"><UTimeline :items="timeline" /></div>
    </KsRow>

    <KsRow label="empty + separator">
      <div class="w-full max-w-lg flex flex-col gap-4">
        <UEmpty icon="i-lucide-inbox" title="Nothing here yet" description="The empty state as Nuxt UI draws it." />
        <USeparator label="or" />
      </div>
    </KsRow>
  </KsSection>
</template>
