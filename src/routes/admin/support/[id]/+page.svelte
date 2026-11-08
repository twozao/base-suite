<script lang="ts">
  import { onMount, tick } from "svelte"
  import { enhance } from "$app/forms"
  import { invalidate } from "$app/navigation"
  import PageHeader from "$lib/components/admin/PageHeader.svelte"
  import StatusBadge from "$lib/components/admin/StatusBadge.svelte"
  import Flash from "$lib/components/admin/Flash.svelte"
  import { formatDateTime } from "$lib/format"
  let { data, form } = $props()
  const c = $derived(data.conversation)
  let thread: HTMLElement | undefined = $state()
  let sending = $state(false)

  const scrollDown = async () => {
    await tick()
    thread?.scrollTo({ top: thread.scrollHeight })
  }
  $effect(() => {
    void data.messages.length
    scrollDown()
  })

  // New visitor messages show up within ~5s while the tab is visible.
  onMount(() => {
    const id = setInterval(() => {
      if (!document.hidden && !sending) invalidate("admin:chat")
    }, 5000)
    return () => clearInterval(id)
  })
</script>

<PageHeader
  title={c.visitor_name || c.visitor_email || "Anonymous visitor"}
  subtitle="Started {formatDateTime(c.created_at)}"
  back="/admin/support"
>
  {#snippet actions()}
    <StatusBadge status={c.status} />
  {/snippet}
</PageHeader>
<Flash {form} />

<div class="grid gap-6 lg:grid-cols-[1fr_18rem]">
  <section
    class="card bg-base-100 border border-base-300 flex flex-col h-[70vh]"
  >
    <div
      bind:this={thread}
      class="grow overflow-y-auto p-4 space-y-3"
      aria-live="polite"
    >
      {#each data.messages as m (m.id)}
        <div class="chat {m.sender === 'staff' ? 'chat-end' : 'chat-start'}">
          <div class="chat-header text-xs opacity-60">
            {m.sender === "staff"
              ? "Support"
              : m.sender === "system"
                ? "System"
                : "Visitor"} - {formatDateTime(m.created_at)}
          </div>
          <div
            class="chat-bubble whitespace-pre-wrap break-words {m.sender ===
            'staff'
              ? 'chat-bubble-primary'
              : ''}"
          >
            {m.body}
          </div>
        </div>
      {/each}
    </div>
    <form
      method="POST"
      action="?/reply"
      class="p-3 border-t border-base-300 flex gap-2"
      use:enhance={() => {
        sending = true
        return async ({ update }) => {
          await update()
          sending = false
        }
      }}
    >
      <textarea
        name="body"
        class="textarea grow h-16"
        placeholder="Write a reply... (Enter to send, Shift+Enter for a new line)"
        maxlength="4000"
        required
        onkeydown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault()
            ;(e.currentTarget as HTMLTextAreaElement).form?.requestSubmit()
          }
        }}
      ></textarea>
      <button class="btn btn-primary self-end" disabled={sending}>Send</button>
    </form>
  </section>

  <aside class="space-y-4">
    <section class="card bg-base-100 border border-base-300">
      <div class="card-body text-sm">
        <dl class="grid grid-cols-[auto_1fr] gap-x-3 gap-y-2">
          <dt class="opacity-60">Email</dt>
          <dd class="break-all">{c.visitor_email ?? " - "}</dd>
          <dt class="opacity-60">Page</dt>
          <dd class="break-all">{c.page_url ?? " - "}</dd>
          <dt class="opacity-60">Account</dt>
          <dd>
            {#if c.user_id}<a class="link" href="/admin/users/{c.user_id}"
                >View user</a
              >{:else}Guest{/if}
          </dd>
          <dt class="opacity-60">Assigned</dt>
          <dd>
            {c.assigned_to
              ? c.assigned_to === data.me
                ? "You"
                : "Teammate"
              : "Nobody"}
          </dd>
        </dl>
        {#if c.visitor_email}
          <a class="btn btn-sm mt-3" href="mailto:{c.visitor_email}"
            >Email visitor</a
          >
        {/if}
      </div>
    </section>
    <section class="card bg-base-100 border border-base-300">
      <div class="card-body gap-2">
        {#if c.assigned_to !== data.me}
          <form method="POST" action="?/assignToMe" use:enhance>
            <button class="btn btn-sm w-full">Assign to me</button>
          </form>
        {/if}
        {#if c.status !== "closed"}
          <form method="POST" action="?/setStatus" use:enhance>
            <input type="hidden" name="status" value="closed" /><button
              class="btn btn-sm w-full">Close conversation</button
            >
          </form>
        {:else}
          <form method="POST" action="?/setStatus" use:enhance>
            <input type="hidden" name="status" value="open" /><button
              class="btn btn-sm w-full">Re-open</button
            >
          </form>
        {/if}
      </div>
    </section>
  </aside>
</div>
