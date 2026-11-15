<script setup lang="ts">
// `code` is imported as `codeCls`: the component has a `code` PROP, and in a
// <script setup> template the prop shadows the import — the wrapper div would
// have rendered the user's code string as its class list.
import { code as codeCls, ident, cx } from "./recipes";

const props = withDefaults(defineProps<{
  /** inline = a chip; line = one command with a $ prompt; block = multi-line config */
  variant?: "inline" | "line" | "block";
  code: string;
  /** substring highlighted as the secret */
  token?: string;
  lang?: string;
  /** the block queries its OWN width: under 360px it stops wrapping and scrolls,
   *  because a command shredded into 3-character stacks is unreadable at any
   *  viewport size */
  wrap?: boolean;
  prompt?: string;
}>(), { variant: "line", wrap: true, prompt: "$" });

/** Only on success: a failed copy must never read as a saved secret. */
const emit = defineEmits<{ copy: [code: string] }>();

const result = ref<"copied" | "failed" | null>(null);

/** Split on the token so it can be marked up without injecting HTML — a token
 *  containing `<` must not be able to break the page. */
const parts = computed(() => {
  if (!props.token || !props.code.includes(props.token)) return [{ text: props.code, tok: false }];
  return props.code.split(props.token).flatMap((chunk: string, i: number, all: string[]) =>
    i < all.length - 1
      ? [{ text: chunk, tok: false }, { text: props.token!, tok: true }]
      : [{ text: chunk, tok: false }]);
});

let reset: ReturnType<typeof setTimeout> | undefined;
async function copy() {
  try {
    await navigator.clipboard.writeText(props.code);
    result.value = "copied";
    emit("copy", props.code);
  } catch {
    // clipboard unavailable or refused: say so, and the token span's select-all leaves a one-click fallback
    result.value = "failed";
  }
  clearTimeout(reset);
  reset = setTimeout(() => (result.value = null), 1600);
}
onBeforeUnmount(() => clearTimeout(reset));
</script>

<template>
  <code v-if="variant === 'inline'" :class="cx(ident.base, ident.kind.package)">{{ code }}</code>

  <div v-else :class="codeCls.wrap">
    <span v-if="variant === 'line' && prompt" :class="codeCls.prompt">{{ prompt }}</span>
    <pre :class="cx(codeCls.pre, wrap ? 'whitespace-pre-wrap break-all @max-[359px]:whitespace-pre @max-[359px]:break-normal' : 'whitespace-pre')"><template v-for="(p, i) in parts" :key="i"><span v-if="p.tok" :class="codeCls.tok">{{ p.text }}</span><template v-else>{{ p.text }}</template></template></pre>
    <span v-if="lang" :class="codeCls.lang">{{ lang }}</span>
    <button type="button" :class="codeCls.copy" :data-done="result === 'copied'" @click="copy">{{ result === "copied" ? "copied" : result === "failed" ? "copy failed" : "copy" }}</button>
    <!-- a changed button label is not announced; this is -->
    <span class="sr-only" role="status">{{ result === "copied" ? "Copied to clipboard" : result === "failed" ? "Couldn't copy — select the text and copy it" : "" }}</span>
  </div>
</template>
