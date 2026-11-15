// Lint and format for the whole workspace: Nuxt's own flat config (the rules @nuxt/eslint would generate, without
// needing a Nuxt app to run it) with its stylistic rules set to how this repository is written: two-space indent,
// single quotes, no semicolons, parenthesized arrow parameters. `pnpm lint`, `pnpm lint --fix`.
//
// Rules turned off are ones the existing code breaks on purpose, so lint passes without a mass reformat:
//   - vue/max-attributes-per-line, vue/singleline-html-element-content-newline: templates are written compactly,
//     several attributes and short content on one line.
//   - @stylistic/max-statements-per-line: tests write small handlers on one line (`{ if (…) errors.push(…) }`).
//   - @stylistic/quotes, @stylistic/semi, @stylistic/member-delimiter-style: the components ported from an earlier design source use
//     double quotes and semicolons; the rest of the repo doesn't. Unifying them is a reformat, not a lint fix.
//   - vue/multi-word-component-names: the layer's components are deliberately one word (Card, Status), as Nuxt
//     UI's are; pages are `index.vue`.
//   - @stylistic/quote-props: an object quotes all its keys or only those that need it, as reads best there.
//   - nuxt/nuxt-config-keys-order: the Nuxt configs group keys by meaning, with comments, not alphabetically.
//   - import/newline-after-import, in packages/nuxt/components only: Identifier.vue puts its one import directly above
//     its code (a one-line fix, left to whoever next edits the components).
import { createConfigForNuxt } from '@nuxt/eslint-config/flat'

export default createConfigForNuxt({
  features: {
    stylistic: { indent: 2, quotes: 'single', semi: false, arrowParens: true, braceStyle: '1tbs' },
  },
})
  .append(
    { ignores: ['packages/theme-forest/design/**'] },
    {
      rules: {
        'vue/max-attributes-per-line': 'off',
        'vue/singleline-html-element-content-newline': 'off',
        '@stylistic/max-statements-per-line': 'off',
        '@stylistic/quotes': 'off',
        '@stylistic/semi': 'off',
        '@stylistic/member-delimiter-style': 'off',
        // Aligned trailing comments are fine; other runs of spaces are not.
        '@stylistic/no-multi-spaces': ['error', { ignoreEOLComments: true }],
        'vue/multi-word-component-names': 'off',
        '@stylistic/quote-props': 'off',
        'nuxt/nuxt-config-keys-order': 'off',
        // Operators end the line they continue (`a +\n  b`); a broken ternary leads with `?` and `:`.
        '@stylistic/operator-linebreak': ['error', 'after', { overrides: { '?': 'before', ':': 'before' } }],
        // Nuxt UI's `loading-auto` awaits the onClick *prop*, which the kitchen sink binds as `:onClick`.
        'vue/attribute-hyphenation': ['warn', 'always', { ignore: ['onClick'] }],
      },
    },
    {
      // The test helpers the layer ships are plain JS in their own style: four-space indents, `}\nelse`, and
      // operators leading the lines they continue.
      files: ['packages/*/testing/**'],
      rules: {
        '@stylistic/indent': ['error', 4],
        '@stylistic/brace-style': ['error', 'stroustrup', { allowSingleLine: true }],
        '@stylistic/operator-linebreak': ['error', 'before'],
        '@stylistic/indent-binary-ops': 'off',
        '@stylistic/multiline-ternary': 'off',
      },
    },
    {
      // The overlay and card wrappers pass Nuxt UI's `ui` prop through, which Nuxt UI itself types loosely.
      files: ['packages/nuxt/components/**'],
      rules: { '@typescript-eslint/no-explicit-any': 'off', 'import/newline-after-import': 'off' },
    },
  )
