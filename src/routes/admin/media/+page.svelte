<script lang="ts">
  import { enhance } from "$app/forms"
  import PageHeader from "$lib/components/admin/PageHeader.svelte"
  import Flash from "$lib/components/admin/Flash.svelte"

  let { data, form } = $props()
  let uploading = $state(false)
  let copied = $state("")

  const kb = (n: number | null) =>
    n == null
      ? ""
      : n > 1024 * 1024
        ? `${(n / 1024 / 1024).toFixed(1)} MB`
        : `${Math.round(n / 1024)} KB`
  async function copy(url: string) {
    await navigator.clipboard.writeText(url)
    copied = url
    setTimeout(() => (copied = ""), 1500)
  }
</script>

<PageHeader
  title="Media"
  subtitle="Images for your logo, pages and blog posts. PNG, JPEG, WebP, GIF or AVIF up to 5 MB."
/>
<Flash {form} />
{#if data.error}<div class="alert alert-warning mb-4">
    <span
      >Couldn't read the media bucket: {data.error}. Run the latest database
      migration.</span
    >
  </div>{/if}

<form
  method="POST"
  action="?/upload"
  enctype="multipart/form-data"
  class="mb-8"
  use:enhance={() => {
    uploading = true
    return async ({ update }) => {
      await update()
      uploading = false
    }
  }}
>
  <label
    class="flex flex-col items-center justify-center gap-2 rounded-box border-2 border-dashed border-base-300 bg-base-100 p-10 text-center cursor-pointer hover:border-primary"
  >
    <span class="font-medium">Drop images here or click to choose</span>
    <span class="text-sm text-base-content/60">Up to 10 at a time</span>
    <input
      type="file"
      name="files"
      accept="image/png,image/jpeg,image/webp,image/gif,image/avif"
      multiple
      class="file-input file-input-sm mt-2"
      onchange={(e) => e.currentTarget.form?.requestSubmit()}
    />
  </label>
  {#if uploading}<p class="mt-2 text-sm">
      <span class="loading loading-spinner loading-xs"></span> Uploading…
    </p>{/if}
</form>

{#if data.files.length}
  <ul
    class="grid gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5"
  >
    {#each data.files as f (f.name)}
      <li
        class="rounded-box border border-base-300 bg-base-100 overflow-hidden"
      >
        <a href={f.url} target="_blank" class="block aspect-square bg-base-200">
          <img
            src={f.url}
            alt={f.name}
            loading="lazy"
            class="h-full w-full object-cover"
          />
        </a>
        <div class="p-3 space-y-2">
          <p class="text-xs truncate" title={f.name}>
            {f.name.replace(/^\d+-[A-Za-z0-9_-]{8}-/, "")}
          </p>
          <p class="text-xs text-base-content/50">{kb(f.size)}</p>
          <div class="flex gap-1">
            <button
              type="button"
              class="btn btn-xs grow"
              onclick={() => copy(f.url)}
              >{copied === f.url ? "Copied ✓" : "Copy URL"}</button
            >
            <form
              method="POST"
              action="?/delete"
              use:enhance={({ cancel }) => {
                if (
                  !confirm(
                    "Delete this image? Pages using it will show a broken image.",
                  )
                )
                  cancel()
              }}
            >
              <input type="hidden" name="name" value={f.name} />
              <button
                class="btn btn-xs btn-ghost text-error"
                aria-label="Delete {f.name}">Delete</button
              >
            </form>
          </div>
        </div>
      </li>
    {/each}
  </ul>
{:else}
  <p class="text-center text-base-content/60 py-10">No images yet.</p>
{/if}
