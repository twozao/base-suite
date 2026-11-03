<script lang="ts" generics="T">
  // Repeatable list with add / remove / reorder, for homepage sections,
  // plans, menus etc. Fields for each item are rendered by the `item` snippet.
  import type { Snippet } from "svelte"

  let {
    items = $bindable(),
    create,
    item,
    max = 20,
    addLabel = "Add item",
    label = (_: T, i: number) => `Item ${i + 1}`,
  }: {
    items: T[]
    create: () => T
    item: Snippet<[T, number]>
    max?: number
    addLabel?: string
    label?: (it: T, i: number) => string
  } = $props()

  const move = (i: number, d: number) => {
    const j = i + d
    if (j < 0 || j >= items.length) return
    const copy = [...items]
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
    items = copy
  }
</script>

<div class="space-y-3">
  {#each items as it, i (i)}
    <fieldset class="rounded-box border border-base-300 bg-base-100">
      <legend class="sr-only">{label(it, i)}</legend>
      <div
        class="flex items-center justify-between gap-2 border-b border-base-300 px-4 py-2"
      >
        <span class="text-sm font-medium truncate">{label(it, i)}</span>
        <div class="flex gap-1 shrink-0">
          <button
            type="button"
            class="btn btn-ghost btn-xs"
            aria-label="Move up"
            disabled={i === 0}
            onclick={() => move(i, -1)}>↑</button
          >
          <button
            type="button"
            class="btn btn-ghost btn-xs"
            aria-label="Move down"
            disabled={i === items.length - 1}
            onclick={() => move(i, 1)}>↓</button
          >
          <button
            type="button"
            class="btn btn-ghost btn-xs text-error"
            onclick={() => (items = items.filter((_, k) => k !== i))}
            >Remove</button
          >
        </div>
      </div>
      <div class="p-4 grid gap-3">{@render item(it, i)}</div>
    </fieldset>
  {/each}
  {#if items.length < max}
    <button
      type="button"
      class="btn btn-sm btn-outline"
      onclick={() => (items = [...items, create()])}>+ {addLabel}</button
    >
  {/if}
</div>
