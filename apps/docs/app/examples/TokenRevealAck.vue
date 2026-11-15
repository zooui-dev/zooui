<script setup lang="ts">
const saved = ref(false)
</script>

<template>
  <div class="flex flex-col gap-2 w-full max-w-xl">
    <ZTokenReveal token="zoo_tok_7Qm2vX9kLr4TzW8nB3cYh6Jd" name="ci-main" require-ack @ack="saved = true">
      It can publish to every feed in this workspace. If you lose it, revoke it and create another.
    </ZTokenReveal>
    <p v-if="saved" class="text-sm text-muted">Saved. The token is hidden for good.</p>
  </div>
</template>
