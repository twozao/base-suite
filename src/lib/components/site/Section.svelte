<script lang="ts">
  import type { Snippet } from "svelte"
  let {
    id = undefined,
    title = "",
    subtitle = "",
    tint = false,
    children,
  }: {
    id?: string
    title?: string
    subtitle?: string
    tint?: boolean
    children: Snippet
  } = $props()
</script>

<section
  {id}
  class="scroll-mt-20 py-20 sm:py-24 {tint ? 'bg-base-200/60' : ''}"
>
  <div class="mx-auto max-w-6xl px-4 sm:px-6">
    {#if title}
      <div class="mx-auto max-w-2xl text-center mb-14">
        <h2 class="text-3xl sm:text-4xl font-bold tracking-tight">{title}</h2>
        {#if subtitle}<p class="mt-4 text-lg text-base-content/70">
            {subtitle}
          </p>{/if}
      </div>
    {/if}
    {@render children()}
  </div>
</section>
