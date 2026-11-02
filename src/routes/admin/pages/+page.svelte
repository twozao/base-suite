<script lang="ts">
  import PageHeader from "$lib/components/admin/PageHeader.svelte"
  import Pagination from "$lib/components/admin/Pagination.svelte"
  import SearchBar from "$lib/components/admin/SearchBar.svelte"
  import StatusBadge from "$lib/components/admin/StatusBadge.svelte"
  import { timeAgo } from "$lib/format"
  let { data } = $props()
</script>

<PageHeader title="Pages" subtitle="Content pages served at /your-slug">
  {#snippet actions()}<a href="/admin/pages/new" class="btn btn-primary btn-sm"
      >New page</a
    >{/snippet}
</PageHeader>

<div role="tablist" class="tabs tabs-box tabs-sm mb-4 w-fit">
  {#each [["", "All"], ["published", "Published"], ["draft", "Drafts"], ["archived", "Archived"]] as [v, label]}
    <a
      role="tab"
      class="tab {data.status === v ? 'tab-active' : ''}"
      href="?status={v}">{label}</a
    >
  {/each}
</div>
<SearchBar q={data.q} placeholder="Search title or URL"
  ><input type="hidden" name="status" value={data.status} /></SearchBar
>

<div class="overflow-x-auto bg-base-100 border border-base-300 rounded-box">
  <table class="table">
    <thead
      ><tr><th>Title</th><th>URL</th><th>Status</th><th>Updated</th></tr></thead
    >
    <tbody>
      {#each data.rows as p (p.id)}
        <tr class="hover:bg-base-200">
          <td
            ><a class="font-medium link link-hover" href="/admin/pages/{p.id}"
              >{p.title}</a
            ></td
          >
          <td>
            {#if p.status === "published"}<a
                class="font-mono text-sm link"
                href="/{p.slug}"
                target="_blank">/{p.slug} ↗</a
              >
            {:else}<span class="font-mono text-sm opacity-60">/{p.slug}</span
              >{/if}
          </td>
          <td><StatusBadge status={p.status} /></td>
          <td class="whitespace-nowrap">{timeAgo(p.updated_at)}</td>
        </tr>
      {:else}
        <tr
          ><td colspan="4" class="text-center py-10"
            ><p class="opacity-60 mb-3">No pages yet.</p>
            <a href="/admin/pages/new" class="btn btn-sm btn-primary"
              >Create your first page</a
            ></td
          ></tr
        >
      {/each}
    </tbody>
  </table>
</div>
<Pagination page={data.page} size={data.size} total={data.total} />
