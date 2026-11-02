<script lang="ts">
  // Tiny always-on button. The chat panel (and its fetch/polling logic) is
  // only downloaded when the visitor opens it, so the widget adds ~1 KB to
  // page weight until used.
  import type { Component } from "svelte"

  let open = $state(false)
  let Panel: Component<{ onclose: () => void }> | null = $state(null)
  let loading = $state(false)

  async function toggle() {
    if (!Panel && !loading) {
      loading = true
      try {
        Panel = (await import("./ChatPanel.svelte")).default
      } finally {
        loading = false
      }
    }
    open = !open
  }
</script>

{#if open && Panel}
  <Panel onclose={() => (open = false)} />
{/if}

<button
  type="button"
  class="btn btn-primary btn-circle btn-lg fixed bottom-5 right-5 z-40 shadow-lg"
  aria-label={open ? "Close chat" : "Chat with us"}
  aria-expanded={open}
  onclick={toggle}
>
  {#if loading}
    <span class="loading loading-spinner"></span>
  {:else if open}
    <svg
      class="h-6 w-6"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      aria-hidden="true"
      ><path stroke-linecap="round" d="M6 18L18 6M6 6l12 12" /></svg
    >
  {:else}
    <svg
      class="h-6 w-6"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      aria-hidden="true"
      ><path
        stroke-linecap="round"
        stroke-linejoin="round"
        d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
      /></svg
    >
  {/if}
</button>
