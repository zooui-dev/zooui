<script setup lang="ts">
/**
 * ZUrlInput on the Forest theme (tests/url-input.spec.ts drives it, in both color modes): a UFormField whose error is bound to v-model:error, with a log of
 * every model update; add-www; one outside a UFormField whose page shows the message itself; a UFormField left
 * unbound, so only the input is marked; a UForm whose rule checks the address on blur and on submit; a value set and
 * cleared by the parent; and a size and a disabled one passed through to UInput.
 */
const show = (v: string | null | undefined) => (v === null ? 'null' : v === undefined ? 'undefined' : JSON.stringify(v))

const site = ref<string | null>(null)
const siteError = ref<string | null>(null)
const siteUpdates = ref<string[]>([])

const www = ref<string | null>(null)

const plain = ref<string | null>(null)
const plainError = ref<string | null>(null)

const unbound = ref<string | null>(null)

const form = reactive({ website: null as string | null })
const saved = ref<string>()
function validate(s: typeof form) {
  if (!s.website) return [{ name: 'website', message: 'Enter the shop website' }]
  if (!isWebAddress(s.website)) return [{ name: 'website', message: 'Enter an address like example.com' }]
  return []
}

const loaded = ref<string | null>('https://example.org')
const loadedError = ref<string | null>(null)

const sized = ref<string | null>('https://example.com')
const locked = ref<string | null>('https://example.com/locked')
</script>

<template>
  <main class="mx-auto flex max-w-4xl flex-col gap-8 px-4 py-8">
    <header class="flex flex-col gap-2">
      <h1 class="text-2xl font-semibold">ZUrlInput</h1>
      <p class="text-muted">
        A website address field. Typing goes into the model as it is; leaving the field (or pressing Enter) trims the
        text, puts https:// in front and checks it has a real host such as example.com. An address that fails is kept as
        typed and the field is marked invalid until it is committed again. Each section shows what the parent holds:
        "model" is the v-model and "error" the v-model:error, with null shown as null. The text box at the bottom is
        somewhere to Tab or click to.
      </p>
    </header>

    <section data-section="field" class="flex flex-col gap-2">
      <h2 class="text-lg font-semibold">In a UFormField, error bound</h2>
      <p class="text-sm text-muted">Try this: type "example.com/about" and press Tab: it becomes https://example.com/about. Then type "not a site" and Tab: the field shows "Invalid website address" until the next commit. The list is every model update, oldest first.</p>
      <UFormField label="Website" :error="siteError ?? undefined" help="Your project's home page">
        <ZUrlInput v-model="site" v-model:error="siteError" class="w-full max-w-sm" @update:model-value="(v) => siteUpdates.push(show(v))" />
      </UFormField>
      <p class="text-sm">model: <span data-testid="field-model">{{ show(site) }}</span></p>
      <p class="text-sm">error: <span data-testid="field-error">{{ show(siteError) }}</span></p>
      <p class="text-sm">model updates:</p>
      <ol data-testid="field-updates" class="text-sm">
        <li v-for="(u, i) in siteUpdates" :key="i">{{ u }}</li>
      </ol>
    </section>

    <section data-section="www" class="flex flex-col gap-2">
      <h2 class="text-lg font-semibold">add-www</h2>
      <p class="text-sm text-muted">Try this: type "example.com" and Tab: it becomes https://www.example.com. A host with more labels, "shop.example.com", is left alone.</p>
      <UFormField label="Website (adds www.)">
        <ZUrlInput v-model="www" add-www class="w-full max-w-sm" />
      </UFormField>
      <p class="text-sm">model: <span data-testid="www-model">{{ show(www) }}</span></p>
    </section>

    <section data-section="plain" class="flex flex-col gap-2">
      <h2 class="text-lg font-semibold">Outside a UFormField</h2>
      <p class="text-sm text-muted">Try this: type "localhost" and Tab. The input is marked invalid, and the page shows the message it got from v-model:error (custom here: "Enter a website like example.com").</p>
      <ZUrlInput v-model="plain" v-model:error="plainError" aria-label="Team website" invalid-message="Enter a website like example.com" class="w-full max-w-sm" />
      <p v-if="plainError" data-testid="plain-message" class="text-sm text-error">{{ plainError }}</p>
      <p class="text-sm">model: <span data-testid="plain-model">{{ show(plain) }}</span></p>
    </section>

    <section data-section="unbound" class="flex flex-col gap-2">
      <h2 class="text-lg font-semibold">In a UFormField, error unbound</h2>
      <p class="text-sm text-muted">Try this: type "example" and Tab. The field shows no message (nothing is bound to it), but the input is marked invalid in the error color and a screen reader hears why.</p>
      <UFormField label="Store website">
        <ZUrlInput v-model="unbound" class="w-full max-w-sm" />
      </UFormField>
      <p class="text-sm">model: <span data-testid="unbound-model">{{ show(unbound) }}</span></p>
    </section>

    <section data-section="form" class="flex flex-col gap-2">
      <h2 class="text-lg font-semibold">In a UForm</h2>
      <p class="text-sm text-muted">Try this: type "example.com" and press Enter. The address is normalized before the form submits, so "saved" shows https://example.com. Its rule uses isWebAddress, so "localhost" is refused on blur.</p>
      <UForm :state="form" :validate="validate" class="flex flex-col gap-2" @submit="saved = form.website ?? ''">
        <UFormField label="Shop website" name="website">
          <ZUrlInput v-model="form.website" class="w-full max-w-sm" />
        </UFormField>
        <UButton type="submit" label="Save" class="self-start" />
      </UForm>
      <p class="text-sm">saved: <span data-testid="form-saved">{{ show(saved) }}</span></p>
    </section>

    <section data-section="loaded" class="flex flex-col gap-2">
      <h2 class="text-lg font-semibold">Set by the parent</h2>
      <p class="text-sm text-muted">Try this: type "nope" and Tab to mark it invalid, then press Load another or Clear. A value from the parent clears the error.</p>
      <UFormField label="Project website" :error="loadedError ?? undefined">
        <ZUrlInput v-model="loaded" v-model:error="loadedError" class="w-full max-w-sm" />
      </UFormField>
      <p class="text-sm">model: <span data-testid="loaded-model">{{ show(loaded) }}</span></p>
      <p class="text-sm">error: <span data-testid="loaded-error">{{ show(loadedError) }}</span></p>
      <div class="flex gap-2">
        <UButton data-action="load" label="Load another" size="sm" color="neutral" variant="outline" @click="loaded = 'https://example.net'" />
        <UButton data-action="clear" label="Clear" size="sm" color="neutral" variant="outline" @click="loaded = null" />
      </div>
    </section>

    <section data-section="pass-through" class="flex flex-col gap-2">
      <h2 class="text-lg font-semibold">UInput's props</h2>
      <p class="text-sm text-muted">Try this: the first field is size xl from its UFormField; the second is disabled. Every UInput prop passes through.</p>
      <UFormField label="Large" size="xl">
        <ZUrlInput v-model="sized" data-size="xl" class="w-full max-w-sm" />
      </UFormField>
      <UFormField label="Locked">
        <ZUrlInput v-model="locked" disabled class="w-full max-w-sm" />
      </UFormField>
    </section>

    <UFormField label="Somewhere else">
      <UInput placeholder="Somewhere else" class="max-w-sm" />
    </UFormField>
  </main>
</template>
