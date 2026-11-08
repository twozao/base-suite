<script lang="ts">
  // Small always-on button; the chat panel is only downloaded when the visitor opens it.
  // With buttonless set, the AI assistant's "Talk to a person" opens it instead, so the site shows one launcher.
  import type { Component } from "svelte"
  import { onMount } from "svelte"

  let { buttonless = false }: { buttonless?: boolean } = $props()
  let assistantHidden = $state(false)

  let open = $state(false)
  let Panel: Component<{ onclose: () => void; initialDraft?: string }> | null =
    $state(null)
  let loading = $state(false)
  let initialDraft = $state("")

  async function load() {
    if (!Panel && !loading) {
      loading = true
      try {
        Panel = (await import("./ChatPanel.svelte")).default
      } finally {
        loading = false
      }
    }
  }

  async function toggle() {
    await load()
    open = !open
  }

  onMount(() => {
    const onHandoff = async (e: Event) => {
      const question = (e as CustomEvent<{ question?: string }>).detail
        ?.question
      initialDraft = question ? question.slice(0, 4000) : ""
      await load()
      open = true
    }
    const onUnavailable = () => (assistantHidden = true)
    window.addEventListener("assistant:handoff", onHandoff)
    window.addEventListener("assistant:unavailable", onUnavailable)
    return () => {
      window.removeEventListener("assistant:handoff", onHandoff)
      window.removeEventListener("assistant:unavailable", onUnavailable)
    }
  })
</script>

{#if open && Panel}
  <Panel onclose={() => (open = false)} {initialDraft} />
{/if}

{#if !buttonless || assistantHidden}
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
{/if}
