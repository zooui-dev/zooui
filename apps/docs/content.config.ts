import { defineCollection, defineContentConfig, z } from '@nuxt/content'

// One collection: every page of the site. A component page names its component in `component`; the page then gets
// the generated API table (props, emits, slots) and a place in the home page's gallery, from that one field.
export default defineContentConfig({
  collections: {
    docs: defineCollection({
      type: 'page',
      // `**`, not `**/*.md`: each folder's .navigation.yml (its title and icon in the sidebar) must be read too
      source: '**',
      schema: z.object({
        /** The Z* component this page documents, as registered: `ZKicker`. */
        component: z.string().optional(),
        /** For a wrapper: the Nuxt UI component its other props, events and slots pass through to (`UModal`). */
        wraps: z.string().optional(),
        /** The example shown on the component's gallery card (a file in app/examples/, without `.vue`). */
        preview: z.string().optional(),
      }),
    }),
  },
})
