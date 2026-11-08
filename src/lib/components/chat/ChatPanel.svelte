<script lang="ts">
  import { onMount, tick } from "svelte"

  type Message = {
    id: number
    sender: "visitor" | "staff" | "system"
    body: string
    created_at: string
  }
  type ChatState = {
    enabled: boolean
    greeting?: string
    offlineMessage?: string
    requireEmail?: boolean
    signedIn?: boolean
    conversation?: { id: string; status: string } | null
    messages?: Message[]
  }

  let {
    onclose,
    initialDraft = "",
  }: { onclose: () => void; initialDraft?: string } = $props()

  let chat: ChatState | null = $state(null)
  let messages: Message[] = $state([])
  // svelte-ignore state_referenced_locally
  let draft = $state(initialDraft)
  let name = $state("")
  let email = $state("")
  let sending = $state(false)
  let errorText = $state("")
  let list: HTMLElement | undefined = $state()

  const lastId = () => messages[messages.length - 1]?.id ?? 0

  // Polling backs off from 4s to 30s while nothing new arrives, and pauses
  // entirely when the tab is hidden.
  let delay = 4000
  let timer: ReturnType<typeof setTimeout> | undefined

  async function poll() {
    try {
      const res = await fetch(`/api/chat?after=${lastId()}`, {
        headers: { accept: "application/json" },
      })
      if (res.ok) {
        const data: ChatState = await res.json()
        chat = data
        const fresh = (data.messages ?? []).filter((m) => m.id > lastId())
        if (fresh.length) {
          messages = [...messages, ...fresh]
          delay = 4000
          await scrollDown()
        } else {
          delay = Math.min(delay * 1.5, 30000)
        }
      } else if (res.status === 429) {
        delay = 30000
      }
    } catch {
      delay = Math.min(delay * 2, 30000)
    }
    schedule()
  }

  function schedule() {
    clearTimeout(timer)
    // Only keep polling once a conversation exists
    if (!chat?.conversation || document.hidden) return
    timer = setTimeout(poll, delay)
  }

  async function scrollDown() {
    await tick()
    list?.scrollTo({ top: list.scrollHeight })
  }

  async function send(e: SubmitEvent) {
    e.preventDefault()
    if (!draft.trim() || sending) return
    sending = true
    errorText = ""
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          message: draft,
          name: name || undefined,
          email: email || undefined,
          pageUrl: location.href,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        errorText = data.error ?? data.message ?? "Message not sent"
        return
      }
      if (chat) chat.conversation = data.conversation
      messages = [...messages, data.message]
      draft = ""
      delay = 4000
      await scrollDown()
      schedule()
    } catch {
      errorText = "Network error, please try again"
    } finally {
      sending = false
    }
  }

  function onKey(e: KeyboardEvent) {
    if (e.key === "Escape") onclose()
  }

  onMount(() => {
    const onVisibility = () => {
      if (!document.hidden) {
        delay = 4000
        poll()
      } else clearTimeout(timer)
    }
    document.addEventListener("visibilitychange", onVisibility)
    poll()
    return () => {
      clearTimeout(timer)
      document.removeEventListener("visibilitychange", onVisibility)
    }
  })

  const time = (iso: string) =>
    new Date(iso).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })
</script>

<div
  class="fixed bottom-24 right-5 z-40 w-[min(24rem,calc(100vw-2.5rem))] h-[min(32rem,calc(100vh-8rem))] flex flex-col rounded-box bg-base-100 shadow-2xl border border-base-300"
  aria-label="Live chat"
  role="dialog"
  tabindex="-1"
  onkeydown={onKey}
>
  <header
    class="flex items-center justify-between px-4 py-3 bg-primary text-primary-content rounded-t-box"
  >
    <h2 class="font-bold">Chat with us</h2>
    <button
      class="btn btn-ghost btn-sm btn-circle"
      aria-label="Close chat"
      onclick={onclose}>x</button
    >
  </header>

  {#if chat === null}
    <div class="grow grid place-items-center">
      <span class="loading loading-dots"></span>
    </div>
  {:else if !chat.enabled}
    <p class="p-4 grow">
      Chat isn't available right now. Please use the <a
        class="link"
        href="/contact_us">contact form</a
      >.
    </p>
  {:else}
    <div
      bind:this={list}
      class="grow overflow-y-auto p-4 space-y-3"
      aria-live="polite"
    >
      <div class="chat chat-start">
        <div class="chat-bubble">{chat.greeting}</div>
      </div>
      {#if chat.offlineMessage}
        <p class="text-sm opacity-70 text-center">{chat.offlineMessage}</p>
      {/if}
      {#each messages as m (m.id)}
        <div class="chat {m.sender === 'visitor' ? 'chat-end' : 'chat-start'}">
          <div
            class="chat-bubble whitespace-pre-wrap break-words {m.sender ===
            'visitor'
              ? 'chat-bubble-primary'
              : ''}"
          >
            {m.body}
          </div>
          <div class="chat-footer opacity-60 text-xs">
            {m.sender === "staff" ? "Support - " : ""}{time(m.created_at)}
          </div>
        </div>
      {/each}
    </div>

    <form class="p-3 border-t border-base-300 space-y-2" onsubmit={send}>
      {#if !chat.conversation && !chat.signedIn}
        <div class="flex gap-2">
          <input
            class="input input-sm w-1/2"
            placeholder="Name"
            autocomplete="name"
            maxlength="200"
            bind:value={name}
            aria-label="Your name"
          />
          <input
            class="input input-sm w-1/2"
            type="email"
            placeholder={chat.requireEmail ? "Email (required)" : "Email"}
            autocomplete="email"
            maxlength="320"
            required={chat.requireEmail}
            bind:value={email}
            aria-label="Your email"
          />
        </div>
      {/if}
      {#if errorText}<p class="text-error text-sm" role="alert">
          {errorText}
        </p>{/if}
      <div class="flex gap-2">
        <textarea
          class="textarea textarea-sm grow min-h-10 h-10 resize-none"
          placeholder="Type your message..."
          maxlength="4000"
          aria-label="Message"
          bind:value={draft}
          onkeydown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault()
              ;(e.currentTarget as HTMLTextAreaElement).form?.requestSubmit()
            }
          }}
        ></textarea>
        <button
          class="btn btn-primary btn-sm h-10"
          disabled={sending || !draft.trim()}
        >
          {sending ? "..." : "Send"}
        </button>
      </div>
    </form>
  {/if}
</div>
