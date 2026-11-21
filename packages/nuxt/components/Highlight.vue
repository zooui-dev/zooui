<script setup lang="ts">
// Text with each match of a search wrapped in <mark>: a search result's name, an option's label or description.
//
//   <ZHighlight :text="person.name" :query="searchTerm" />
//   <ZHighlight :text="person.email" :query="searchTerm" :ui="{ mark: 'bg-transparent text-primary underline' }" />
//
// The search is ZFilterSelect's (utils/filter-match.ts): literal and case-insensitive, every match marked, left to
// right. What is typed is text, never a pattern, so `(` or `.` match themselves. The text is drawn as Vue text nodes
// and <mark> elements, never through v-html, so a `<b>` or an `<img onerror>` in it reads as those characters.
//
// It renders no element of its own, only the runs of text and the marks, so it drops into whatever holds it (a
// truncating span, a menu item's label) without changing its layout. Put classes on that element, not on ZHighlight.
// `ui.mark` takes classes for the marks, merged over the defaults with tailwind-merge.
import { twMerge } from 'tailwind-merge'
import { filterSelectSegments } from '../utils/filter-match'

defineOptions({ inheritAttrs: false })

const props = defineProps<{
  /** The text to draw. A number is drawn as its string; null or undefined as nothing. */
  text?: string | number | null
  /** What to find in it. Empty, null or undefined: the text with nothing marked. */
  query?: string | null
  /** Classes for the parts, merged over the defaults. */
  ui?: { mark?: string }
}>()

const segments = computed(() => filterSelectSegments(props.text == null ? '' : String(props.text), props.query ?? ''))
const markClass = computed(() => twMerge('rounded-xs bg-primary/15 font-semibold text-highlighted', props.ui?.mark))
</script>

<template>
  <template v-for="(segment, i) in segments" :key="i">
    <mark v-if="segment.match" :class="markClass">{{ segment.text }}</mark>
    <template v-else>{{ segment.text }}</template>
  </template>
</template>
