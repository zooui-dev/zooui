<script setup lang="ts">
interface Contact { id: string, email: string }

const contacts = ref<Contact[]>([
  { id: 'c1', email: 'pat@example.com' },
  { id: 'c2', email: 'not an address' },
])
let next = 3
const newContact = (): Contact => ({ id: `c${next++}`, email: '' })

// Errors by row key, as a form's validation would set them.
const errors = computed(() => Object.fromEntries(contacts.value
  .filter((c) => c.email && !/^\S+@\S+\.\S+$/.test(c.email))
  .map((c) => [c.id, 'Enter an email address, like name@example.com.'])))
</script>

<template>
  <div class="w-full max-w-lg">
    <ZRepeatingList
      v-model="contacts"
      item-label="contact"
      :row-key="(c: Contact) => c.id"
      :new-row="newContact"
      :errors="errors"
    >
      <template #row="{ row, index, errorId }">
        <UFormField :label="`Email ${index + 1}`">
          <UInput v-model="row.email" type="email" :aria-describedby="errorId" :aria-invalid="!!errorId" />
        </UFormField>
      </template>
    </ZRepeatingList>
  </div>
</template>
