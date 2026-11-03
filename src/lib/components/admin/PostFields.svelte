<script lang="ts">
  import ImageField from "./ImageField.svelte"
  type V = {
    cover_image_url: string
    author_name: string
    tags: string
    published_at: string
  }
  let { values, errors = {} }: { values: V; errors?: Record<string, string> } =
    $props()
  // svelte-ignore state_referenced_locally
  let cover = $state(values.cover_image_url)
  // datetime-local wants "YYYY-MM-DDTHH:mm" in local time
  const toLocal = (iso: string) => {
    if (!iso) return ""
    const d = new Date(iso)
    if (Number.isNaN(d.getTime())) return ""
    return new Date(d.getTime() - d.getTimezoneOffset() * 60000)
      .toISOString()
      .slice(0, 16)
  }
  // svelte-ignore state_referenced_locally
  let localDate = $state(toLocal(values.published_at))
  const isoDate = $derived(localDate ? new Date(localDate).toISOString() : "")
</script>

<ImageField label="Cover image" bind:value={cover} />
<input type="hidden" name="cover_image_url" value={cover} />
{#if errors.cover_image_url}<span class="text-error text-sm"
    >{errors.cover_image_url}</span
  >{/if}
<label class="block">
  <span class="label text-sm whitespace-normal mb-1">Author</span>
  <input
    name="author_name"
    class="input input-sm w-full"
    maxlength="120"
    value={values.author_name}
  />
</label>
<label class="block">
  <span class="label text-sm whitespace-normal mb-1"
    >Tags (comma separated)</span
  >
  <input
    name="tags"
    class="input input-sm w-full"
    maxlength="400"
    value={values.tags}
    placeholder="news, guides"
  />
  {#if errors.tags}<span class="text-error text-sm">{errors.tags}</span>{/if}
</label>
<label class="block">
  <span class="label text-sm whitespace-normal mb-1">Publish date</span>
  <input
    type="datetime-local"
    class="input input-sm w-full"
    bind:value={localDate}
  />
  <input type="hidden" name="published_at" value={isoDate} />
  <span class="text-xs text-base-content/60"
    >Leave empty to use the time you publish. A future date schedules the post.</span
  >
</label>
