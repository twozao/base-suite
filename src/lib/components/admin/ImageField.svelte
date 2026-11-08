<script lang="ts">
  // Image URL input with preview and a picker over the Media library.
  let {
    label,
    value = $bindable(),
    hint = "",
  }: { label: string; value: string; hint?: string } = $props()

  let picking = $state(false)
  let files: { name: string; url: string }[] = $state([])
  let loading = $state(false)

  async function openPicker() {
    picking = true
    loading = true
    try {
      const res = await fetch("/admin/media/list")
      files = res.ok ? (await res.json()).files : []
    } finally {
      loading = false
    }
  }
</script>

<div>
  <span class="mb-1 block text-sm font-medium">{label}</span>
  <div class="flex gap-3 items-start">
    <div
      class="h-16 w-24 shrink-0 overflow-hidden rounded-lg border border-base-300 bg-base-200 grid place-items-center"
    >
      {#if value}<img
          src={value}
          alt=""
          class="h-full w-full object-cover"
        />{:else}<span class="text-xs text-base-content/40">No image</span>{/if}
    </div>
    <div class="grow space-y-2">
      <input
        class="input input-sm w-full font-mono text-xs"
        placeholder="https://... or choose from Media"
        maxlength="1000"
        bind:value
      />
      <div class="flex gap-2">
        <button type="button" class="btn btn-xs" onclick={openPicker}
          >Choose from Media</button
        >
        {#if value}<button
            type="button"
            class="btn btn-xs btn-ghost"
            onclick={() => (value = "")}>Clear</button
          >{/if}
      </div>
    </div>
  </div>
  {#if hint}<span class="mt-1 block text-xs text-base-content/60">{hint}</span
    >{/if}
</div>

{#if picking}
  <div
    class="modal modal-open"
    role="dialog"
    aria-modal="true"
    aria-label="Choose an image"
  >
    <div class="modal-box max-w-3xl">
      <h3 class="font-bold text-lg mb-4">Choose an image</h3>
      {#if loading}
        <span class="loading loading-dots"></span>
      {:else if files.length === 0}
        <p class="text-base-content/70">
          No images yet. <a class="link" href="/admin/media" target="_blank"
            >Upload some in Media</a
          >, then reopen this.
        </p>
      {:else}
        <div
          class="grid grid-cols-3 sm:grid-cols-4 gap-3 max-h-[60vh] overflow-y-auto"
        >
          {#each files as f (f.url)}
            <button
              type="button"
              class="aspect-square overflow-hidden rounded-lg border border-base-300 hover:ring-2 hover:ring-primary"
              title={f.name}
              onclick={() => {
                value = f.url
                picking = false
              }}
            >
              <img
                src={f.url}
                alt={f.name}
                class="h-full w-full object-cover"
                loading="lazy"
              />
            </button>
          {/each}
        </div>
      {/if}
      <div class="modal-action">
        <button type="button" class="btn" onclick={() => (picking = false)}
          >Cancel</button
        >
      </div>
    </div>
    <button
      type="button"
      class="modal-backdrop"
      aria-label="Close"
      onclick={() => (picking = false)}
    ></button>
  </div>
{/if}
