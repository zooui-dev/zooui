<script setup lang="ts">
const text = ref('')
const textarea = ref('')
const number = ref(3)
const select = ref('eu-west')
const selectMenu = ref({ label: 'Nuxt', value: 'nuxt' })
const inputMenu = ref('')
const tags = ref(['design', 'system'])
const check = ref(true)
const checkGroup = ref(['email'])
const radio = ref('weekly')
const toggle = ref(true)
const slider = ref(40)
const pin = ref<string[]>([])
const rating = ref(3)

const regions = [
  { label: 'EU West', value: 'eu-west' },
  { label: 'US East', value: 'us-east' },
  { label: 'AP South', value: 'ap-south' },
]
const frameworks = [
  { label: 'Nuxt', value: 'nuxt' },
  { label: 'Vue', value: 'vue' },
  { label: 'Nitro', value: 'nitro' },
]
const channels = [
  { label: 'Email', value: 'email' },
  { label: 'Slack', value: 'slack' },
  { label: 'Webhook', value: 'webhook' },
]
const cadence = [
  { label: 'Daily', value: 'daily' },
  { label: 'Weekly', value: 'weekly' },
  { label: 'Never', value: 'never' },
]

// A real UForm so the shipped validation styling shows: submit empty and the field goes to its error state.
const state = reactive({ email: '', password: '' })
const toast = useToast()
function validate(s: typeof state) {
  const errors: { name: string; message: string }[] = []
  if (!s.email) errors.push({ name: 'email', message: 'An email address is required' })
  else if (!s.email.includes('@')) errors.push({ name: 'email', message: 'That is not an email address' })
  if (s.password.length < 8) errors.push({ name: 'password', message: 'At least 8 characters' })
  return errors
}
function onSubmit() {
  toast.add({ title: 'Submitted', description: 'The form validated.', color: 'success' })
}
// A native type="reset" resets the DOM inputs but not `state` (v-model) or UForm's errors, so a later Submit
// would validate the old values. Reset both explicitly.
const form = useTemplateRef('form')
function onReset() {
  Object.assign(state, { email: '', password: '' })
  form.value?.clear()
}
</script>

<template>
  <KsSection id="form" title="Form" note="Every input Nuxt UI ships, at default size, plus a real UForm showing label, help and error styling.">
    <div class="grid sm:grid-cols-2 gap-4">
      <UFormField label="Input" help="With a help line underneath.">
        <UInput v-model="text" placeholder="Workspace name" class="w-full" />
      </UFormField>
      <UFormField label="Input with icons">
        <UInput v-model="text" icon="i-lucide-search" placeholder="Search" class="w-full" />
      </UFormField>
      <UFormField label="Textarea">
        <UTextarea v-model="textarea" :rows="3" placeholder="Notes" class="w-full" />
      </UFormField>
      <UFormField label="Number">
        <UInputNumber v-model="number" class="w-full" />
      </UFormField>
      <UFormField label="Select">
        <USelect v-model="select" :items="regions" class="w-full" />
      </UFormField>
      <UFormField label="Select menu (searchable)">
        <USelectMenu v-model="selectMenu" :items="frameworks" class="w-full" />
      </UFormField>
      <UFormField label="Input menu (autocomplete)">
        <UInputMenu v-model="inputMenu" :items="['Alpha', 'Beta', 'Gamma']" class="w-full" />
      </UFormField>
      <UFormField label="Input tags">
        <UInputTags v-model="tags" class="w-full" />
      </UFormField>
      <UFormField label="Disabled" help="Disabled state of the default input.">
        <UInput model-value="Read only" disabled class="w-full" />
      </UFormField>
      <UFormField label="Pin input">
        <UPinInput v-model="pin" :length="4" />
      </UFormField>
    </div>

    <KsRow label="toggles">
      <UCheckbox v-model="check" label="Checkbox" />
      <UCheckbox :model-value="false" label="Unchecked" />
      <UCheckbox indeterminate label="Indeterminate" />
      <USwitch v-model="toggle" label="Switch" />
      <USwitch :model-value="false" label="Off" disabled />
    </KsRow>

    <KsRow label="groups">
      <div class="flex flex-wrap gap-8">
        <UCheckboxGroup v-model="checkGroup" :items="channels" legend="Notify me by" />
        <URadioGroup v-model="radio" :items="cadence" legend="Digest" />
      </div>
    </KsRow>

    <KsRow label="slider + rating">
      <div class="w-full max-w-sm flex flex-col gap-4">
        <USlider v-model="slider" />
        <UInputRating v-model="rating" />
      </div>
    </KsRow>

    <KsRow label="file + color + date">
      <div class="flex flex-wrap items-start gap-4">
        <UFileUpload label="Drop a file" description="PNG or PDF, up to 4MB" class="w-64 min-h-32" />
        <UColorPicker />
        <UCalendar />
      </div>
    </KsRow>

    <KsRow label="UForm">
      <UForm ref="form" :state="state" :validate="validate" class="w-full max-w-sm flex flex-col gap-3" @submit="onSubmit">
        <UFormField label="Email" name="email" required>
          <UInput v-model="state.email" placeholder="you@example.com" class="w-full" />
        </UFormField>
        <UFormField label="Password" name="password" help="At least 8 characters." required>
          <UInput v-model="state.password" type="password" class="w-full" />
        </UFormField>
        <div class="flex gap-2">
          <UButton type="submit">Submit</UButton>
          <UButton color="neutral" variant="ghost" @click="onReset">Reset</UButton>
        </div>
      </UForm>
    </KsRow>
  </KsSection>
</template>
