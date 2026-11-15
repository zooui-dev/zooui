import { queryCollectionSearchSections } from '@nuxt/content/server'

// The search index: every page split into its sections, prerendered once to a static file the search dialog fetches
// when it first opens.
export default defineEventHandler((event) => queryCollectionSearchSections(event, 'docs'))
