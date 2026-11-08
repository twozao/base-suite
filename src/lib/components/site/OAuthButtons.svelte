<script lang="ts">
  // Full page links: these are server routes that redirect to the provider.
  type Provider = { id: string; label: string }
  let {
    providers,
    next = null,
    verb = "Continue with",
  }: { providers: Provider[]; next?: string | null; verb?: string } = $props()
  const href = (id: string) =>
    `/auth/oauth/${id}${next ? `?next=${encodeURIComponent(next)}` : ""}`
</script>

{#if providers.length}
  <div class="flex flex-col gap-2">
    {#each providers as p (p.id)}
      <a href={href(p.id)} data-sveltekit-reload class="btn btn-outline w-full">
        {#if p.id === "google"}
          <svg viewBox="0 0 24 24" class="h-5 w-5" aria-hidden="true">
            <path
              fill="#4285F4"
              d="M23.5 12.3c0-.9-.1-1.7-.2-2.5H12v4.7h6.5a5.5 5.5 0 0 1-2.4 3.6v3h3.9c2.3-2.1 3.5-5.2 3.5-8.8z"
            />
            <path
              fill="#34A853"
              d="M12 24c3.2 0 6-1.1 8-2.9l-3.9-3c-1.1.7-2.5 1.2-4.1 1.2-3.1 0-5.8-2.1-6.7-5H1.3v3.1A12 12 0 0 0 12 24z"
            />
            <path
              fill="#FBBC05"
              d="M5.3 14.3a7.2 7.2 0 0 1 0-4.6V6.6h-4a12 12 0 0 0 0 10.8l4-3.1z"
            />
            <path
              fill="#EA4335"
              d="M12 4.8c1.8 0 3.3.6 4.6 1.8L20 3.2A12 12 0 0 0 1.3 6.6l4 3.1c.9-2.9 3.6-4.9 6.7-4.9z"
            />
          </svg>
        {:else}
          <svg
            viewBox="0 0 24 24"
            class="h-5 w-5 fill-current"
            aria-hidden="true"
          >
            <path
              d="M12 .5a12 12 0 0 0-3.8 23.4c.6.1.8-.3.8-.6v-2.1c-3.3.7-4-1.6-4-1.6-.6-1.4-1.4-1.8-1.4-1.8-1.1-.8.1-.7.1-.7 1.2.1 1.9 1.2 1.9 1.2 1.1 1.8 2.8 1.3 3.5 1 .1-.8.4-1.3.8-1.6-2.7-.3-5.5-1.3-5.5-5.9 0-1.3.5-2.4 1.2-3.2-.1-.3-.5-1.5.1-3.2 0 0 1-.3 3.3 1.2a11.500 11.500 0 0 1 6 0c2.300-1.500 3.300-1.200 3.300-1.200.7 1.700.2 2.900.1 3.200.8.8 1.200 1.900 1.200 3.200 0 4.600-2.800 5.600-5.500 5.900.4.400.8 1.100.8 2.200v3.300c0 .3.2.7.8.6A12 12 0 0 0 12 .5z"
            />
          </svg>
        {/if}
        {verb}
        {p.label}
      </a>
    {/each}
  </div>
{/if}
