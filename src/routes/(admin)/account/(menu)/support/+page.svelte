<script lang="ts">
  import { getContext, onMount, tick } from "svelte"
  import type { Writable } from "svelte/store"
  import { invalidate } from "$app/navigation"
  import { formatDateTime } from "$lib/format"
  let adminSection: Writable<string> = getContext("adminSection")
  adminSection.set("support")
  let { data } = $props()

  let draft = $state("")
  let sending = $state(false)
  let errorText = $state("")
  let thread: HTMLElement | undefined = $state()

  $effect(() => {
    void data.messages.length
    tick().then(() => thread?.scrollTo({ top: thread.scrollHeight }))
  })
  onMount(() => {
    const t = setInterval(
      () => !document.hidden && invalidate("account:support"),
      10000,
    )
    return () => clearInterval(t)
  })

  async function send(e: SubmitEvent) {
    e.preventDefault()
    if (!draft.trim()) return
    sending = true
    errorText = ""
    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ message: draft, pageUrl: location.href }),
    })
    sending = false
    if (!res.ok) {
      errorText =
        (await res.json().catch(() => ({}))).error ?? "Message not sent"
      return
    }
    draft = ""
    await invalidate("account:support")
  }
</script>

<svelte:head><title>Support</title></svelte:head>

<h1 class="text-3xl font-bold tracking-tight">Support</h1>
<p class="mt-1 text-base-content/70">
  Message our team. We'll reply here and by email.
</p>

<section
  class="card bg-base-100 border border-base-300 mt-8 flex flex-col h-[65vh]"
>
  <div
    bind:this={thread}
    class="grow overflow-y-auto p-4 space-y-3"
    aria-live="polite"
  >
    {#each data.messages as m (m.id)}
      <div class="chat {m.sender === 'visitor' ? 'chat-end' : 'chat-start'}">
        <div class="chat-header text-xs opacity-60">
          {m.sender === "visitor" ? "You" : "Support"} - {formatDateTime(
            m.created_at,
          )}
        </div>
        <div
          class="chat-bubble whitespace-pre-wrap break-words {m.sender ===
          'visitor'
            ? 'chat-bubble-primary'
            : ''}"
        >
          {m.body}
        </div>
      </div>
    {:else}
      <p class="text-center text-base-content/60 py-10">
        No messages yet. Say hello
      </p>
    {/each}
  </div>
  <form class="p-3 border-t border-base-300 flex gap-2" onsubmit={send}>
    <textarea
      class="textarea grow h-16"
      placeholder="Write a message..."
      maxlength="4000"
      bind:value={draft}
      aria-label="Message"
    ></textarea>
    <button class="btn btn-primary self-end" disabled={sending || !draft.trim()}
      >Send</button
    >
  </form>
  {#if errorText}<p class="px-4 pb-3 text-error text-sm" role="alert">
      {errorText}
    </p>{/if}
</section>
