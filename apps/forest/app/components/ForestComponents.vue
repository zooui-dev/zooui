<script setup lang="ts">
/**
 * Zoo UI's own components — what Nuxt UI has no equivalent of. Not in the shared kitchen-sink specimens: the baseline
 * has nothing to compare them with.
 */
const states = ['healthy', 'warn', 'suspended', 'unreachable', 'quiet'] as const

const ecosystems = ['npm', 'nuget', 'winget', 'chocolatey', 'scoop', 'homebrew'] as const
const sizes = ['sm', 'md', 'lg'] as const

/** What ZTokenReveal emitted, in order, so the tests can read its events off the page. */
const tokenEvents = ref<string[]>([])

// Named slot chips, and the current-page marker on a highlighted menu
const linux = [
  { label: 'slot 1 · free', available: true },
  { label: 'slot 2 · build 4812', available: false, title: 'Held since 09:41' },
  { label: 'slot 3 · free', available: true },
]
const nav = [
  { label: 'Fleet', to: '#zoo', active: true },
  // explicit, so the demo never depends on how a hash link matches the current route
  { label: 'Runs', to: '#zoo', active: false },
  { label: 'Settings', to: '#zoo', active: false },
]
</script>

<template>
  <KsSection id="zoo" title="Zoo UI components" note="What Nuxt UI has no equivalent of: the kicker (bracketed, or the eyebrow), identifiers, status by shape, named slot chips, the quota meter, the code block, the shown-once token and ecosystem marks, on Nuxt UI's tokens.">
    <KsRow label="kicker">
      <ZKicker data-specimen="kicker">deployments</ZKicker>
    </KsRow>

    <KsRow label="eyebrow">
      <div class="flex flex-col gap-1">
        <ZKicker variant="eyebrow" data-specimen="eyebrow">runners</ZKicker>
        <p class="text-2xl font-semibold text-highlighted m-0">The <span class="text-(--ui-color-primary-700) dark:text-(--ui-color-primary-300)">fleet</span> tonight</p>
      </div>
    </KsRow>

    <KsRow label="nav marker">
      <UNavigationMenu :items="nav" variant="link" color="neutral" highlight highlight-color="primary" data-specimen="nav" />
    </KsRow>

    <KsRow label="slots">
      <ZSlots :slots="linux" label="Linux VMs: 2 of 3 free" data-specimen="slots" />
    </KsRow>

    <KsRow label="identifiers">
      <div class="flex items-center gap-3 flex-wrap">
        <ZIdentifier kind="package" data-specimen="ident-package">@zooui/nuxt</ZIdentifier>
        <ZIdentifier kind="version" data-specimen="ident-version">2.0.0</ZIdentifier>
        <ZIdentifier kind="hash" data-specimen="ident-hash">9658e6a</ZIdentifier>
        <ZIdentifier kind="plain" data-specimen="ident-plain">api-worker</ZIdentifier>
      </div>
    </KsRow>

    <KsRow label="status">
      <div class="flex flex-col gap-2">
        <div class="flex items-center gap-4 flex-wrap">
          <ZStatus v-for="s in states" :key="s" :state="s" :data-status="s" />
        </div>
        <div class="flex items-center gap-2 flex-wrap">
          <ZStatus v-for="s in states" :key="s" :state="s" pill :data-status-pill="s" />
        </div>
        <div class="flex items-center gap-4 flex-wrap">
          <ZStatus state="healthy" glow data-status-glow="healthy" />
          <ZStatus state="warn" glow data-status-glow="warn" />
        </div>
      </div>
    </KsRow>

    <KsRow label="quota meter">
      <div class="flex flex-col gap-2 w-full max-w-sm">
        <ZQuotaMeter :used="3.2" :quota="10" data-meter="ok" />
        <ZQuotaMeter :used="8.6" :quota="10" data-meter="warn" />
        <ZQuotaMeter :used="10.4" :quota="10" size="lg" data-meter="over" />
      </div>
    </KsRow>

    <KsRow label="code">
      <div class="flex flex-col gap-2 w-full">
        <p class="text-sm text-muted m-0">Install with <ZCodeBlock variant="inline" code="pnpm add @zooui/theme-forest" /></p>
        <ZCodeBlock variant="line" code="pnpm add @zooui/theme-forest" data-code="line" />
        <ZCodeBlock variant="block" lang="npmrc" token="${NPM_TOKEN}" :code="'@zooui:registry=https://registry.npmjs.org/\n//registry.npmjs.org/:_authToken=${NPM_TOKEN}'" data-code="block" />
      </div>
    </KsRow>

    <KsRow label="token reveal">
      <div class="flex flex-col gap-2 w-full max-w-xl">
        <ZTokenReveal
          token="zoo_tok_7Qm2vX9kLr4TzW8nB3cYh6Jd" name="ci-main" require-ack data-specimen="token-reveal"
          @copy="tokenEvents.push('copy')" @ack="tokenEvents.push('ack')"
        />
        <p class="text-xs text-muted m-0 font-mono" data-specimen="token-events">events: {{ tokenEvents.join(' ') || 'none' }}</p>
      </div>
    </KsRow>

    <KsRow label="ecosystems">
      <div class="flex flex-col gap-3">
        <div v-for="size in sizes" :key="size" class="flex items-center gap-3">
          <ZEcosystemMark v-for="e in ecosystems" :key="e" :ecosystem="e" :size="size" :data-eco-specimen="`${e}-${size}`" />
        </div>
        <div class="flex items-center gap-4 flex-wrap">
          <ZEcosystemMark ecosystem="winget" with-label data-eco-specimen="labeled" />
          <ZEcosystemMark ecosystem="scoop" with-label disabled data-eco-specimen="disabled-labeled" />
          <ZEcosystemMark ecosystem="homebrew" disabled data-eco-specimen="disabled" />
          <ZEcosystemMark ecosystem="cargo" label="Cargo" monogram="rs" shape="lens" size="md" data-eco-specimen="custom" />
          <ZEcosystemMark ecosystem="pypi" size="md" data-eco-specimen="unknown" />
        </div>
      </div>
    </KsRow>

    <KsRow label="theme">
      <ZThemeToggle />
    </KsRow>
  </KsSection>
</template>
