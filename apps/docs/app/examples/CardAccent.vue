<template>
  <section data-accent="violet" class="w-full rounded-md bg-(--accent-soft) p-4 flex flex-col gap-3">
    <p class="text-sm font-semibold text-(--accent-strong)">Billing</p>
    <ZCard color="accent">
      <p class="text-sm">This card's edge is the section's accent.</p>
    </ZCard>
  </section>
</template>

<style>
/* The product supplies each hue's stops; here, Tailwind's violet. */
[data-accent='violet'] {
  --a-50: var(--color-violet-50); --a-100: var(--color-violet-100); --a-200: var(--color-violet-200);
  --a-400: var(--color-violet-400); --a-500: var(--color-violet-500); --a-600: var(--color-violet-600);
  --a-800: var(--color-violet-800); --a-950: var(--color-violet-950);
}
</style>
