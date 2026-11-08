<script lang="ts">
  import type { Snippet } from "svelte"
  let {
    title,
    subtitle = "",
    back = "",
    actions,
  }: {
    title: string
    subtitle?: string
    back?: string
    actions?: Snippet
  } = $props()
</script>

<svelte:head><title>{title} - Admin</title></svelte:head>

<header class="flex flex-wrap items-end justify-between gap-4 mb-6">
  <div>
    {#if back}
      <a href={back} class="link link-hover text-sm opacity-70">Back</a>
    {/if}
    <h1 class="text-2xl lg:text-3xl font-bold">{title}</h1>
    {#if subtitle}<p class="opacity-70 mt-1">{subtitle}</p>{/if}
  </div>
  {#if actions}<div class="flex gap-2">{@render actions()}</div>{/if}
</header>
