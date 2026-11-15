<script setup lang="ts">
/**
 * One small settings screen, built only from what the layer provides:
 *   U*  — Nuxt UI as it ships, in Forest's colors and typefaces (no import, no install in this app)
 *   Z*  — Zoo UI's additions: the colored-edge dialog, and the components Nuxt UI has no equivalent of
 *         (kicker, status by shape, quota meter, code block, identifier, theme toggle)
 */
const toast = useToast()

const name = ref('Northwind Platform')
const region = ref('eu-west')
const regions = [
  { label: 'EU West', value: 'eu-west' },
  { label: 'US East', value: 'us-east' },
]
const alerts = ref(true)
const range = ref('7d')
const ranges = [{ label: '24h', value: '24h' }, { label: '7d', value: '7d' }, { label: '30d', value: '30d' }]
const confirmOpen = ref(false)

const services = [
  { name: 'api', state: 'healthy', label: 'healthy' },
  { name: 'worker', state: 'warn', label: 'degraded · 2 retries' },
  { name: 'scheduler', state: 'suspended', label: 'paused by an admin' },
] as const

function save() {
  toast.add({ title: 'Settings saved', color: 'primary' })
}
</script>

<template>
  <main class="mx-auto w-full max-w-[720px] px-4 sm:px-6 py-10 flex flex-col gap-6">
    <header class="flex items-start justify-between gap-4 flex-wrap">
      <div class="flex flex-col gap-1.5">
        <ZKicker>zooui starter</ZKicker>
        <h1 class="font-display text-3xl font-medium tracking-tight text-highlighted m-0">Workspace settings</h1>
        <p class="text-sm text-muted m-0">Nuxt UI and the Zoo UI components, from one layer.</p>
      </div>
      <ZThemeToggle />
    </header>

    <UAlert color="info" variant="outline" icon="i-lucide-info" title="This app installs no UI library">
      <template #description>
        <code>@nuxt/ui</code> comes with <code>@zooui/theme-forest</code>, already in Forest's colors.
      </template>
    </UAlert>

    <UCard>
      <template #header>
        <h2 class="text-lg font-semibold text-highlighted m-0">General</h2>
      </template>
      <div class="flex flex-col gap-4">
        <UFormField label="Workspace name" help="Shown in the sidebar and in every email.">
          <UInput v-model="name" class="w-full" />
        </UFormField>
        <UFormField label="Region">
          <USelect v-model="region" :items="regions" class="w-48" />
        </UFormField>
        <USwitch v-model="alerts" label="Email me when a service degrades" />
      </div>
      <template #footer>
        <div class="flex gap-2 justify-end">
          <UButton color="neutral" variant="ghost">Cancel</UButton>
          <UButton color="primary" variant="solid" @click="save">Save</UButton>
        </div>
      </template>
    </UCard>

    <section class="flex flex-col gap-3">
      <div class="flex items-center justify-between gap-3 flex-wrap">
        <h2 class="text-lg font-semibold text-highlighted m-0">Services</h2>
        <UTabs v-model="range" :items="ranges" :content="false" size="xs" aria-label="Range" />
      </div>
      <ul class="m-0 p-0 list-none flex flex-col divide-y divide-default ring ring-default rounded-md bg-default">
        <li v-for="s in services" :key="s.name" class="flex items-center justify-between gap-3 px-3 h-10">
          <ZIdentifier kind="plain">{{ s.name }}</ZIdentifier>
          <ZStatus :state="s.state">{{ s.label }}</ZStatus>
        </li>
      </ul>
      <ZQuotaMeter :used="8.4" :quota="10" unit="GB" />
    </section>

    <section class="flex flex-col gap-2">
      <h2 class="text-lg font-semibold text-highlighted m-0">Use the layer elsewhere</h2>
      <p class="text-sm text-muted m-0">Not on npm yet: the Forest theme stays private until its AT fonts move to a package of their own. Here the starter takes it from the workspace:</p>
      <ZCodeBlock variant="line" code="&quot;@zooui/theme-forest&quot;: &quot;workspace:*&quot;" />
    </section>

    <section class="flex items-center justify-between gap-3 border-t border-default pt-4 flex-wrap">
      <span class="text-sm text-muted">Deleting a workspace removes its services and history.</span>
      <UButton color="error" variant="outline" @click="confirmOpen = true">Delete workspace</UButton>
    </section>

    <ZModal v-model:open="confirmOpen" color="error" title="Delete this workspace?" description="This cannot be undone.">
      <template #body>
        <p class="text-sm text-muted m-0">Every service, token and log in <strong class="text-highlighted font-medium">{{ name }}</strong> is removed.</p>
      </template>
      <template #footer>
        <div class="flex gap-2 justify-end w-full">
          <UButton color="neutral" variant="ghost" @click="confirmOpen = false">Keep it</UButton>
          <UButton color="error" variant="outline" @click="confirmOpen = false">Delete</UButton>
        </div>
      </template>
    </ZModal>
  </main>
</template>
