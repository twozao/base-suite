<script lang="ts">
  // Searchable grid of block types, opened from the + between blocks.
  import type { BlockType } from "$lib/blocks"
  import { BLOCK_ICONS } from "./icons"
  import Icon from "./Icon.svelte"

  let {
    types,
    onpick,
    onclose,
  }: {
    types: { type: BlockType; label: string; hint: string }[]
    onpick: (t: BlockType) => void
    onclose: () => void
  } = $props()
  let q = $state("")
  const shown = $derived(
    types.filter((t) =>
      `${t.label} ${t.hint}`.toLowerCase().includes(q.toLowerCase()),
    ),
  )
  let root: HTMLDivElement | undefined = $state()
  const focusNow = (el: HTMLInputElement) => {
    requestAnimationFrame(() => el.focus())
  }
  function outside(e: MouseEvent) {
    if (root && !root.contains(e.target as Node)) onclose()
  }
</script>

<svelte:window onmousedown={outside} />

<div
  bind:this={root}
  class="absolute left-1/2 top-full z-40 mt-1 w-[min(36rem,calc(100vw-2rem))] -translate-x-1/2 rounded-box border border-base-300 bg-base-100 p-3 shadow-xl"
>
  <input
    class="input input-sm mb-3 w-full"
    placeholder="Search blocks"
    aria-label="Search blocks"
    bind:value={q}
    use:focusNow
    onkeydown={(e) => {
      if (e.key === "Escape") onclose()
      if (e.key === "Enter") {
        e.preventDefault()
        if (shown[0]) onpick(shown[0].type)
      }
    }}
  />
  <div class="grid max-h-80 grid-cols-2 gap-1 overflow-y-auto sm:grid-cols-3">
    {#each shown as t (t.type)}
      <button
        type="button"
        class="flex items-start gap-2 rounded-lg p-2 text-left hover:bg-base-200 focus:bg-base-200 focus:outline-none"
        onclick={() => onpick(t.type)}
      >
        <span
          class="grid size-8 shrink-0 place-items-center rounded-lg border border-base-300 bg-base-100"
          ><Icon d={BLOCK_ICONS[t.type]} /></span
        >
        <span class="min-w-0"
          ><span class="block text-sm font-medium">{t.label}</span><span
            class="block text-xs leading-snug opacity-60">{t.hint}</span
          ></span
        >
      </button>
    {:else}<p class="col-span-full p-2 text-sm opacity-60">
        No block matches.
      </p>{/each}
  </div>
</div>
