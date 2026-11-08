<script lang="ts">
  import PageHeader from "$lib/components/admin/PageHeader.svelte"
  import { formatDateTime } from "$lib/format"
  let { data } = $props()
</script>

<PageHeader
  title={data.type.name}
  subtitle="/{data.type.url_prefix}"
  back="/admin/content"
>
  {#snippet actions()}
    {#if data.type.has_archive}<a
        class="btn btn-sm"
        href="/{data.type.url_prefix}"
        target="_blank">View list</a
      >{/if}
    <a class="btn btn-primary btn-sm" href="/admin/content/{data.type.slug}/new"
      >New {data.type.singular.toLowerCase()}</a
    >
  {/snippet}
</PageHeader>

<form class="mb-4 flex flex-wrap gap-2">
  <input
    name="q"
    class="input input-sm"
    placeholder="Search titles"
    value={data.q}
  />
  <select name="status" class="select select-sm" value={data.status}>
    <option value="">All</option><option value="draft">Drafts</option><option
      value="published">Published</option
    ><option value="archived">Archived</option>
  </select>
  <button class="btn btn-sm">Filter</button>
</form>

<div class="overflow-x-auto rounded-box border border-base-300 bg-base-100">
  <table class="table">
    <thead><tr><th>Title</th><th>Status</th><th>Updated</th></tr></thead>
    <tbody>
      {#each data.entries as e (e.id)}
        <tr>
          <td
            ><a
              class="link link-hover font-medium"
              href="/admin/content/{data.type.slug}/{e.id}">{e.title}</a
            >
            <div class="font-mono text-xs opacity-60">
              /{data.type.url_prefix}/{e.slug}
            </div></td
          >
          <td
            ><span
              class="badge badge-sm {e.status === 'published'
                ? 'badge-success'
                : e.review_requested_at
                  ? 'badge-warning'
                  : 'badge-ghost'}"
              >{e.review_requested_at && e.status !== "published"
                ? "in review"
                : e.status}</span
            ></td
          >
          <td class="text-sm">{formatDateTime(e.updated_at)}</td>
        </tr>
      {:else}
        <tr><td colspan="3" class="opacity-60">No entries yet.</td></tr>
      {/each}
    </tbody>
  </table>
</div>
