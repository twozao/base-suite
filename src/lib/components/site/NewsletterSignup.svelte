<script lang="ts">
  import { enhance } from "$app/forms"
  let {
    form = null,
    source = "",
    compact = false,
  }: {
    form?: { done?: boolean; confirmed?: boolean; error?: string } | null
    source?: string
    compact?: boolean
  } = $props()
  let result: { done?: boolean; confirmed?: boolean; error?: string } | null =
    $state(null)
  const shown = $derived(result ?? form)
  let busy = $state(false)
</script>

{#if shown?.done}
  <p class="text-sm {compact ? '' : 'text-base'}" role="status">
    {shown.confirmed
      ? "Thanks — you're subscribed! 🎉"
      : "Almost there — check your inbox to confirm. ✉️"}
  </p>
{:else}
  <form
    method="POST"
    action="/newsletter"
    class="flex flex-col sm:flex-row gap-2 {compact ? '' : 'justify-center'}"
    use:enhance={() => {
      busy = true
      return async ({ result: r, update }) => {
        busy = false
        if (r.type === "success" || r.type === "failure")
          result = r.data as typeof result
        else await update()
      }
    }}
  >
    <input type="hidden" name="source" value={source} />
    <div class="hidden" aria-hidden="true">
      <input type="text" name="website_url" tabindex="-1" autocomplete="off" />
    </div>
    <label class="sr-only" for="nl-email-{source}">Email address</label>
    <input
      id="nl-email-{source}"
      type="email"
      name="email"
      required
      maxlength="320"
      placeholder="you@example.com"
      autocomplete="email"
      class="input {compact ? 'input-sm' : ''} w-full sm:w-72"
    />
    <button class="btn btn-primary {compact ? 'btn-sm' : ''}" disabled={busy}
      >{busy ? "…" : "Subscribe"}</button
    >
  </form>
  {#if shown?.error}<p class="text-error text-sm mt-2" role="alert">
      {shown.error}
    </p>{/if}
{/if}
