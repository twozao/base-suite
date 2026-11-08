<script lang="ts">
  import { enhance } from "$app/forms"
  import PageHeader from "$lib/components/admin/PageHeader.svelte"
  import Flash from "$lib/components/admin/Flash.svelte"
  import { formatDateTime } from "$lib/format"
  let { data, form } = $props()
  let busy = $state(false)
  const go = () => {
    busy = true
    return async ({ update }: { update: () => Promise<void> }) => {
      await update()
      busy = false
    }
  }
</script>

<PageHeader
  title="Import from WordPress"
  subtitle="Bring posts, pages, custom post types, categories, tags, authors and featured images across. Old addresses become redirects."
/>
<Flash {form} />

<div class="grid gap-6 lg:grid-cols-2">
  <form
    method="POST"
    action="?/wordpress"
    enctype="multipart/form-data"
    use:enhance={go}
    class="card bg-base-100 border border-base-300"
  >
    <div class="card-body gap-3">
      <h2 class="card-title text-base">1. Import the export file</h2>
      <p class="text-sm opacity-70">
        In WordPress go to Tools, Export, choose All content and download the
        file. Items whose address already exists here are skipped, so running it
        twice is safe.
      </p>
      <input
        type="file"
        name="file"
        accept=".xml,text/xml,application/xml"
        class="file-input file-input-sm w-full"
        required
      />
      <button class="btn btn-primary btn-sm w-fit" disabled={busy}
        >{busy ? "Importing..." : "Import"}</button
      >
    </div>
  </form>
  <form
    method="POST"
    action="?/images"
    use:enhance={go}
    class="card bg-base-100 border border-base-300"
  >
    <div class="card-body gap-3">
      <h2 class="card-title text-base">2. Copy the images</h2>
      <p class="text-sm opacity-70">
        Imported content still shows images from the old site. This copies them
        into Media, a few at a time, and updates the content. {data.pendingImages
          ? `${data.pendingImages} images to copy.`
          : "Nothing to copy right now."}
      </p>
      <button class="btn btn-sm w-fit" disabled={busy || !data.pendingImages}
        >Copy next images</button
      >
    </div>
  </form>
</div>

{#if data.imports.length}
  <h2 class="font-semibold mt-8 mb-2">Past imports</h2>
  <div class="overflow-x-auto rounded-box border border-base-300 bg-base-100">
    <table class="table table-sm">
      <thead
        ><tr
          ><th>When</th><th>Site</th><th>Posts</th><th>Pages</th><th>Other</th
          ><th>Redirects</th><th>Skipped</th></tr
        ></thead
      >
      <tbody>
        {#each data.imports as i (i.id)}
          <tr
            ><td class="text-xs">{formatDateTime(i.created_at)}</td><td
              class="font-mono text-xs">{i.origin}</td
            ><td>{i.counts.posts}</td><td>{i.counts.pages}</td><td
              >{i.counts.entries}</td
            ><td>{i.counts.redirects}</td><td>{i.counts.skipped}</td></tr
          >
        {/each}
      </tbody>
    </table>
  </div>
{/if}
