<script setup lang="ts">
const colors = ['primary', 'secondary', 'success', 'info', 'warning', 'error', 'neutral'] as const
const variants = ['solid', 'outline', 'soft', 'subtle', 'ghost', 'link'] as const
const sizes = ['xs', 'sm', 'md', 'lg', 'xl'] as const

/** `loading-auto` drives the spinner from the promise this returns. */
const slowAction = () => new Promise((resolve) => setTimeout(resolve, 1200))
</script>

<template>
  <KsSection id="buttons" title="Buttons" note="Nuxt UI's color × variant matrix, its five sizes, and the states a button ships with.">
    <KsRow v-for="variant in variants" :key="variant" :label="variant">
      <UButton v-for="color in colors" :key="color" :color="color" :variant="variant">{{ color }}</UButton>
    </KsRow>

    <KsRow label="sizes">
      <UButton v-for="size in sizes" :key="size" :size="size">{{ size }}</UButton>
    </KsRow>

    <KsRow label="with icons">
      <UButton icon="i-lucide-plus">Leading</UButton>
      <UButton trailing-icon="i-lucide-arrow-right">Trailing</UButton>
      <UButton icon="i-lucide-settings" square aria-label="Settings" />
      <UButton icon="i-lucide-trash-2" color="error" variant="soft" square aria-label="Delete" />
    </KsRow>

    <KsRow label="states">
      <UButton loading>Loading</UButton>
      <UButton loading-auto :onClick="slowAction">Loading auto</UButton>
      <UButton disabled>Disabled</UButton>
      <UButton color="neutral" variant="outline" disabled>Disabled outline</UButton>
    </KsRow>

    <KsRow label="block + group">
      <div class="w-full flex flex-col gap-2">
        <UButton block>Block</UButton>
        <UFieldGroup>
          <UButton color="neutral" variant="outline" icon="i-lucide-align-left" aria-label="Left" />
          <UButton color="neutral" variant="outline" icon="i-lucide-align-center" aria-label="Center" />
          <UButton color="neutral" variant="outline" icon="i-lucide-align-right" aria-label="Right" />
        </UFieldGroup>
      </div>
    </KsRow>

    <KsRow label="links">
      <ULink to="https://ui.nuxt.com" target="_blank">A plain link</ULink>
      <UButton to="https://ui.nuxt.com" target="_blank" variant="link" trailing-icon="i-lucide-external-link">Link button</UButton>
      <UKbd value="meta" /><UKbd value="K" />
    </KsRow>
  </KsSection>
</template>
