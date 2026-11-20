<script setup lang="ts">
/**
 * ZHighlight (tests/highlight.spec.ts drives it): a search box over a list of project names, some holding markup and
 * regular-expression characters that must read as text; the marks restyled through `ui`; and the two-line menu
 * option recipe, a UInputMenu whose items show a name and an email with the search marked in both. The `data-*`
 * attributes are the spec's selectors. On the Forest theme.
 */
const PROJECTS = [
  'Website redesign',
  'Fees (monthly)',
  'Q&A [draft]',
  '<b>Bold</b> launch plan',
  '<img src=x onerror="window.__highlightXss = true"> Image audit',
  'Design system review',
]
const query = ref('')
const marked = computed(() => PROJECTS.flatMap((p) => filterSelectSegments(p, query.value)).filter((s) => s.match).map((s) => s.text))
const styled = ref('an')

const PEOPLE = [
  { id: 1, name: 'Ana Lopez', email: 'ana.lopez@example.com' },
  { id: 2, name: 'Sam Lee', email: 'sam@example.com' },
  { id: 3, name: 'Jordan Banks', email: 'j.banks@example.com' },
  { id: 4, name: 'Riley <b>Chen</b>', email: 'riley.chen@example.com' },
]
const person = ref<(typeof PEOPLE)[number]>()
const searchTerm = ref('')
// The menu's own filter matches labels only; this one matches the name or the email, as the marks do.
const people = computed(() => PEOPLE.filter((p) => filterSelectMatches(p.name, searchTerm.value) || filterSelectMatches(p.email, searchTerm.value)))
</script>

<template>
  <main class="mx-auto flex max-w-3xl flex-col gap-10 px-4 py-8">
    <header class="flex flex-col gap-1">
      <h2 class="text-xl font-semibold text-highlighted">ZHighlight</h2>
      <p class="text-sm text-muted">
        ZHighlight draws a piece of text with each match of a search in a &lt;mark&gt;. The search is literal and
        ignores case. Each section has a search box; "Marked:" lists the text of every mark in the list, and "Selected:"
        shows the menu's model. The Playwright specs in tests/highlight.spec.ts drive these sections.
      </p>
    </header>

    <section data-specimen="plain" class="flex flex-col gap-3">
      <h3 class="font-semibold text-highlighted">Search a list</h3>
      <p class="text-sm text-muted">Try: type "de", then "(", then "&lt;b&gt;". Every match is marked, in any case; "(" finds the parenthesis; the names holding tags show the tags as text.</p>
      <UFormField label="Search projects"><UInput v-model="query" placeholder="Search" data-query /></UFormField>
      <ul class="flex flex-col gap-1 text-sm text-default">
        <li v-for="project in PROJECTS" :key="project" data-row><ZHighlight :text="project" :query="query" /></li>
      </ul>
      <p class="text-sm text-muted">Marked: <output data-marked class="text-default">{{ marked.length ? marked.join(', ') : '—' }}</output></p>
    </section>

    <section data-specimen="styled" class="flex flex-col gap-3">
      <h3 class="font-semibold text-highlighted">Styled marks</h3>
      <p class="text-sm text-muted">Try: change the search. These marks take `ui.mark`: no tint, the primary ink, underlined.</p>
      <UFormField label="Search people"><UInput v-model="styled" placeholder="Search" data-query /></UFormField>
      <p class="text-sm text-default" data-row>
        <ZHighlight text="Ana Lopez, Jordan Banks, Dana Grant" :query="styled" :ui="{ mark: 'bg-transparent font-normal text-primary underline' }" />
      </p>
    </section>

    <section data-specimen="menu" class="flex flex-col gap-3">
      <h3 class="font-semibold text-highlighted">Two-line menu option</h3>
      <p class="text-sm text-muted">Try: type "lee" or "example" in the menu. Each option shows a name over an email, the search marked in both; Enter picks the highlighted one.</p>
      <UFormField label="Assign to">
        <UInputMenu
          v-model="person"
          v-model:search-term="searchTerm"
          :items="people"
          label-key="name"
          description-key="email"
          ignore-filter
          placeholder="Search by name or email"
          class="w-72"
          data-menu
        >
          <template #item-label="{ item }"><ZHighlight :text="item.name" :query="searchTerm" /></template>
          <template #item-description="{ item }"><ZHighlight :text="item.email" :query="searchTerm" /></template>
        </UInputMenu>
      </UFormField>
      <p class="text-sm text-muted">Selected: <output data-selected class="text-default">{{ person?.name ?? '—' }}</output></p>
    </section>
  </main>
</template>
