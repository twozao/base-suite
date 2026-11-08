<script lang="ts">
  import { enhance } from "$app/forms"
  import PageHeader from "$lib/components/admin/PageHeader.svelte"
  import Flash from "$lib/components/admin/Flash.svelte"
  let { data, form } = $props()
</script>

<PageHeader
  title="Backup & export"
  subtitle="Your content in one file, to keep, move to another Base Suite site, or roll back."
/>
<Flash {form} />
<div class="grid gap-6 lg:grid-cols-2 max-w-5xl">
  <section class="card bg-base-100 border border-base-300">
    <div class="card-body gap-3">
      <h2 class="card-title text-base">Download</h2>
      <p class="text-sm opacity-70">
        Pages, posts, content types and entries, reusable blocks, redirects,
        forms, translations, extensions, the media list and site settings.
        Accounts, passwords, stored keys and visitor messages are left out.
        Image files stay in storage.
      </p>
      <a
        class="btn btn-primary btn-sm w-fit"
        href="/admin/backup/export.json"
        data-sveltekit-reload>Download backup</a
      >
    </div>
  </section>
  <form
    method="POST"
    action="?/restore"
    enctype="multipart/form-data"
    use:enhance
    class="card bg-base-100 border border-error/30"
  >
    <div class="card-body gap-3">
      <h2 class="card-title text-base">Restore</h2>
      <p class="text-sm opacity-70">
        Items in the file replace items with the same id here. Nothing else is
        deleted.
      </p>
      <input
        type="file"
        name="file"
        accept="application/json,.json"
        class="file-input file-input-sm w-full"
        required
      />
      <input
        name="confirm"
        class="input input-sm w-full"
        placeholder="Type RESTORE to confirm"
        autocomplete="off"
      />
      <button class="btn btn-sm btn-error w-fit">Restore</button>
    </div>
  </form>
</div>
{#if data.cloudflare}
  <p class="mt-6 max-w-3xl text-sm opacity-70">
    On Cloudflare the whole database can also be rolled back to any minute in
    the past days with D1 Time Travel: <code
      >npx wrangler d1 time-travel restore DATABASE --timestamp=...</code
    >
  </p>
{/if}
