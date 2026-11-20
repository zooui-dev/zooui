<script setup lang="ts">
/** What a product renders on the base: Nuxt UI, the Z* components, its own CSS, data-accent sections. */
const COLORS = ['primary', 'secondary', 'success', 'info', 'warning', 'error', 'neutral'] as const

const toast = useToast()
const rows = [{ account: 'Retainer', amount: '1,200.00' }, { account: 'Materials', amount: '3,450.75' }]
</script>

<template>
  <main class="mx-auto flex max-w-4xl flex-col gap-10 px-4 py-8">
    <section id="nuxt-ui" class="flex flex-col gap-4">
      <h2 class="text-base font-semibold text-highlighted">Nuxt UI, in the product's palette</h2>
      <div class="flex flex-wrap gap-2">
        <UButton v-for="c in COLORS" :key="c" :color="c" :label="c" />
      </div>
      <div class="flex items-center gap-2">
        <UBadge data-badge label="In progress" />
        <UKbd value="K" />
      </div>
      <UAlert data-alert color="warning" variant="outline" title="An outline alert" description="Nuxt UI's own: no striped edge." />
      <div>
        <UButton data-toast label="Show a toast" color="neutral" variant="outline" @click="toast.add({ title: 'Saved', description: 'A toast in the product\'s colors.', color: 'success' })" />
      </div>
      <UTable :data="rows" />
    </section>

    <!-- Icons ahead of a data-loading component: in svg mode each UIcon registers onServerPrefetch, an async
         boundary the client stops counting if its bundle strips the call (DateRange.vue says what drifts). -->
    <section id="form" class="flex flex-col gap-4">
      <div class="flex gap-2 text-muted">
        <UIcon name="i-lucide-calendar-days" class="size-5" />
        <UIcon name="i-lucide-landmark" class="size-5" />
        <UIcon name="i-lucide-circle-check" class="size-5" />
      </div>
      <DateRange />
    </section>

    <SpecimensDateFieldSpecimen />

    <section id="zoo" class="flex flex-col items-start gap-4">
      <ZKicker data-specimen="kicker">Deployments</ZKicker>
      <ZKicker variant="eyebrow" data-specimen="eyebrow">Capacity</ZKicker>
      <ZStatus state="healthy" glow data-status="glow" />
      <ZSlots :slots="[{ label: 'slot 1 · free', available: true }, { label: 'slot 2 · build 4812', available: false }]" label="Runners: 1 of 2 free" data-specimen="slots" />
      <ZIdentifier kind="version" data-specimen="ident-version">v2.1.0</ZIdentifier>
      <ZStatus state="healthy" data-status="healthy" />
      <ZQuotaMeter :used="8.5" :quota="10" data-meter="warn" />
      <ZEcosystemMark ecosystem="npm" data-specimen="eco" />
      <ZCodeBlock variant="block" code="export PRODUCT_TOKEN=pk_live_123" token="pk_live_123" data-code="block" />
      <ZCard color="primary" data-edge="primary">A primary edge.</ZCard>
      <ZCard color="accent" data-edge="accent-outside">An accent edge outside any section: the primary.</ZCard>
      <ZTokenReveal token="pk_live_9f8e7d" name="api" require-ack data-specimen="token-reveal" />
    </section>

    <SpecimensNumberInputSpecimen />

    <SpecimensSelectNoneSpecimen />

    <section id="accent" class="grid gap-4 sm:grid-cols-3">
      <div v-for="hue in ['teal', 'cyan', 'unmapped']" :key="hue" :data-accent="hue" :data-section="hue" class="flex flex-col gap-3 rounded-lg border border-(--accent-line) bg-(--accent-soft) p-4">
        <h2 class="section-label">Section · {{ hue }}</h2>
        <span data-probe="solid" class="grid size-10 place-items-center rounded-lg bg-(--accent) text-(--accent-on)">CF</span>
        <p data-probe="strong" class="text-(--accent-strong)">A title in the accent</p>
        <ZCard color="accent" data-edge="accent">An accent edge.</ZCard>
        <!-- Nuxt UI portals the dialog to <body>, out of this section: ZModal carries the section's name with it -->
        <ZModal v-if="hue === 'teal'" color="accent" title="A dialog from the teal section" description="Its edge is the section's accent.">
          <UButton data-open="accent-modal" label="Open a dialog" color="neutral" variant="outline" />
        </ZModal>
      </div>
    </section>

    <section id="product-css" class="flex flex-col items-start gap-3">
      <p data-probe="text-sm" class="text-sm">Fifteen pixels: the product's type scale.</p>
      <p data-probe="navy" class="text-brand-navy">The product's own color token.</p>
      <table><tbody><tr><td data-probe="num" class="num">1,234.50</td></tr></tbody></table>
      <span data-probe="val-input" class="rounded px-2 py-0.5 bg-val-input-bg text-val-input ring ring-inset ring-val-input-line">12,000</span>
    </section>
    <SpecimensRepeatingListSpecimen />
    <SpecimensFilterSelectSpecimen />
  </main>
</template>
