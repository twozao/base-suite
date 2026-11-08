<script lang="ts">
  import { applyAction, deserialize, enhance } from "$app/forms"
  import { invalidateAll } from "$app/navigation"
  import PageHeader from "$lib/components/admin/PageHeader.svelte"
  import Flash from "$lib/components/admin/Flash.svelte"

  let { data, form } = $props()
  let uploading = $state("")
  let copied = $state("")
  let open: string | null = $state(null)

  const WIDTHS = [480, 960, 1600]
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

  // Smaller WebP copies are made here in the browser, so pages can send phones a lighter image.
  async function resized(file: File, width: number): Promise<Blob | null> {
    try {
      const bmp = await createImageBitmap(file)
      if (width >= bmp.width) return null
      const canvas = document.createElement("canvas")
      canvas.width = width
      canvas.height = Math.round((bmp.height * width) / bmp.width)
      canvas.getContext("2d")?.drawImage(bmp, 0, 0, canvas.width, canvas.height)
      bmp.close()
      return await new Promise((r) =>
        canvas.toBlob(
          (b) => r(b && b.type === "image/webp" ? b : null),
          "image/webp",
          0.82,
        ),
      )
    } catch {
      return null
    }
  }

  async function upload(e: SubmitEvent) {
    e.preventDefault()
    const formEl = e.currentTarget as HTMLFormElement
    const input = formEl.querySelector<HTMLInputElement>("input[type=file]")
    const files = [...(input?.files ?? [])].slice(0, 10)
    if (!files.length) return
    const fd = new FormData()
    for (const [i, f] of files.entries()) {
      fd.append("files", f)
      if (f.type === "image/gif") continue
      uploading = `Preparing ${f.name}...`
      for (const w of WIDTHS) {
        const b = await resized(f, w)
        if (b)
          fd.append(
            `variant_${i}_${w}`,
            new File([b], `v${w}.webp`, { type: "image/webp" }),
          )
      }
    }
    uploading = "Uploading..."
    try {
      const res = await fetch(formEl.action, {
        method: "POST",
        body: fd,
        headers: { "x-sveltekit-action": "true" },
      })
      const result = deserialize(await res.text())
      if (result.type === "success") await invalidateAll()
      await applyAction(result)
    } finally {
      uploading = ""
      if (input) input.value = ""
    }
  }
</script>

<PageHeader
  title="Media"
  subtitle="Images for your pages and posts. PNG, JPEG, WebP, GIF or AVIF up to 5 MB. Smaller copies are made for phones."
/>
<Flash {form} />
{#if data.error}<div class="alert alert-warning mb-4">
    <span>Couldn't read the media store: {data.error}</span>
  </div>{/if}

<div class="mb-8 grid gap-4 lg:grid-cols-[1fr_22rem]">
  <form
    method="POST"
    action="?/upload"
    enctype="multipart/form-data"
    onsubmit={upload}
  >
    <label
      class="flex flex-col items-center justify-center gap-2 rounded-box border-2 border-dashed border-base-300 bg-base-100 p-8 text-center cursor-pointer hover:border-primary"
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
        <span class="loading loading-spinner loading-xs"></span>
        {uploading}
      </p>{/if}
  </form>
  <form
    method="POST"
    action="?/import"
    use:enhance
    class="card bg-base-100 border border-base-300"
  >
    <div class="card-body gap-2">
      <h2 class="font-semibold text-sm">Copy from an address</h2>
      <input
        name="url"
        class="input input-sm w-full font-mono"
        placeholder="https://example.com/photo.jpg"
        maxlength="1000"
      />
      <button class="btn btn-sm">Copy into Media</button>
      <p class="text-xs opacity-60">Public https addresses only.</p>
    </div>
  </form>
</div>

{#if data.files.length}
  <ul
    class="grid gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5"
  >
    {#each data.files as f (f.name)}
      <li
        class="rounded-box border border-base-300 bg-base-100 overflow-hidden"
      >
        <button
          type="button"
          class="block aspect-square w-full bg-base-200"
          onclick={() => (open = open === f.name ? null : f.name)}
          aria-label="Edit details of {f.name}"
        >
          <img
            src={f.url}
            alt={f.alt || f.name}
            loading="lazy"
            class="h-full w-full object-cover"
            style="object-position: {f.focalX}% {f.focalY}%"
          />
        </button>
        <div class="p-3 space-y-2">
          <p class="text-xs truncate" title={f.name}>
            {f.name.replace(/^\d+-[A-Za-z0-9_-]{8}-/, "")}
          </p>
          <p class="text-xs text-base-content/50">
            {kb(f.size)}{f.width ? ` - ${f.width}x${f.height}` : ""}{f.variants
              .length
              ? ` - ${f.variants.length} sizes`
              : ""}
          </p>
          {#if !f.alt}<p class="text-xs text-warning">No alt text</p>{/if}
          <div class="flex gap-1">
            <button
              type="button"
              class="btn btn-xs grow"
              onclick={() => copy(f.url)}
              >{copied === f.url ? "Copied" : "Copy URL"}</button
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
          {#if open === f.name}
            <form
              method="POST"
              action="?/update"
              use:enhance={() =>
                async ({ update }) =>
                  update({ reset: false })}
              class="space-y-2 border-t border-base-200 pt-2"
            >
              <input type="hidden" name="name" value={f.name} />
              <label class="block text-xs"
                >Alt text<input
                  name="alt"
                  class="input input-xs w-full"
                  maxlength="300"
                  value={f.alt}
                /></label
              >
              <p class="text-xs opacity-70">
                Focal point: the part kept when the image is cropped
              </p>
              <div class="grid grid-cols-2 gap-2">
                <label class="text-xs"
                  >Across %<input
                    name="focal_x"
                    type="number"
                    min="0"
                    max="100"
                    class="input input-xs w-full"
                    value={f.focalX}
                  /></label
                >
                <label class="text-xs"
                  >Down %<input
                    name="focal_y"
                    type="number"
                    min="0"
                    max="100"
                    class="input input-xs w-full"
                    value={f.focalY}
                  /></label
                >
              </div>
              <button class="btn btn-xs btn-primary w-full">Save details</button
              >
            </form>
          {/if}
        </div>
      </li>
    {/each}
  </ul>
{:else}
  <p class="text-center text-base-content/60 py-10">No images yet.</p>
{/if}
