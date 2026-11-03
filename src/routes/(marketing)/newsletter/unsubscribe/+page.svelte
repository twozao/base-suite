<script lang="ts">
  import { enhance } from "$app/forms"
  let { data, form } = $props()
</script>

<svelte:head
  ><title>Unsubscribe</title><meta
    name="robots"
    content="noindex"
  /></svelte:head
>
<section class="min-h-[60vh] grid place-items-center px-4 py-20 text-center">
  <div class="max-w-md">
    {#if form?.done}
      <h1 class="text-3xl font-bold">You've been unsubscribed</h1>
      <p class="mt-3 text-base-content/70">
        You won't receive any more emails from {data.site.brand.siteName}.
      </p>
    {:else if form}
      <h1 class="text-3xl font-bold">Link not recognised</h1>
      <p class="mt-3 text-base-content/70">
        This unsubscribe link is invalid. Reply to any of our emails and we'll
        remove you.
      </p>
    {:else}
      <h1 class="text-3xl font-bold">Unsubscribe?</h1>
      <p class="mt-3 text-base-content/70">
        You'll stop receiving newsletter emails from {data.site.brand.siteName}.
      </p>
      <form method="POST" use:enhance class="mt-8">
        <input type="hidden" name="token" value={data.token} />
        <button class="btn btn-primary">Unsubscribe</button>
      </form>
    {/if}
  </div>
</section>
