<script setup lang="ts">
const notify = useNotify()

/** What $fetch throws for a 409 with a problem-details body. */
const conflict = Object.assign(new Error('[PUT] "/api/projects/7": 409 Conflict'), {
  data: { title: 'Conflict', status: 409, detail: 'The project was changed by someone else.' },
})
</script>

<template>
  <div class="flex flex-col items-start gap-3">
    <div class="flex flex-wrap gap-2">
      <UButton label="Success" color="success" variant="outline" @click="notify.success('Project saved', 'The Lakeside project is up to date.')" />
      <UButton label="Info" color="info" variant="outline" @click="notify.info('Sync started')" />
      <UButton label="Warning" color="warning" variant="outline" @click="notify.warning('Two tasks have no owner', 'Assign them before the sprint starts.')" />
      <UButton label="Error" color="error" variant="outline" @click="notify.error('Couldn’t save the project', conflict)" />
      <UButton label="Primary" variant="outline" @click="notify.primary('Invite sent')" />
    </div>
    <p class="m-0 text-sm text-muted">The error passes the caught error itself: <code>{{ errorMessage(conflict) }}</code></p>
  </div>
</template>
