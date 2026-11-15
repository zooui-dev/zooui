<script setup lang="ts">
const colors = ['primary', 'secondary', 'success', 'info', 'warning', 'error', 'neutral'] as const
const toast = useToast()

function notify(color: (typeof colors)[number]) {
  toast.add({
    title: `${color[0]!.toUpperCase()}${color.slice(1)} toast`,
    description: 'Nuxt UI stacks, times out and animates these itself.',
    color,
    icon: 'i-lucide-bell',
  })
}
</script>

<template>
  <KsSection id="feedback" title="Feedback" note="Alerts and toasts — the colors Nuxt UI assigns to meaning out of the box.">
    <KsRow label="alert">
      <div class="w-full flex flex-col gap-2">
        <UAlert
          v-for="c in colors" :key="c" :color="c" variant="subtle" :title="`${c} alert`"
          description="A short description of what happened." icon="i-lucide-info"
        />
      </div>
    </KsRow>

    <KsRow label="alert variants">
      <div class="w-full flex flex-col gap-2">
        <UAlert color="info" variant="solid" title="Solid" description="With a close button." icon="i-lucide-info" close />
        <UAlert color="info" variant="outline" title="Outline" description="With an action." icon="i-lucide-info" :actions="[{ label: 'Undo', color: 'neutral', variant: 'outline' }]" />
        <UAlert color="info" variant="soft" title="Soft" description="The soft variant." icon="i-lucide-info" />
      </div>
    </KsRow>

    <KsRow label="toast">
      <UButton v-for="c in colors" :key="c" :color="c" variant="soft" @click="notify(c)">{{ c }}</UButton>
    </KsRow>
  </KsSection>
</template>
