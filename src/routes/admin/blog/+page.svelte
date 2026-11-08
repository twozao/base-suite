<script lang="ts">
  import PageHeader from "$lib/components/admin/PageHeader.svelte"
  import Pagination from "$lib/components/admin/Pagination.svelte"
  import SearchBar from "$lib/components/admin/SearchBar.svelte"
  import StatusBadge from "$lib/components/admin/StatusBadge.svelte"
  import { formatDate, timeAgo } from "$lib/format"
  let { data } = $props()
</script>

<PageHeader title="Blog" subtitle="Posts published at /blog">
  {#snippet actions()}
    <a href="/blog" target="_blank" class="btn btn-sm">View blog</a>
    <a href="/admin/blog/new" class="btn btn-primary btn-sm">New post</a>
  {/snippet}
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

<div
  class="bg-base-100 border border-base-300 rounded-box divide-y divide-base-200"
>
  {#each data.rows as p (p.id)}
    <a
      href="/admin/blog/{p.id}"
      class="flex items-center gap-4 p-3 hover:bg-base-200"
    >
      <div class="h-12 w-20 shrink-0 overflow-hidden rounded bg-base-200">
        {#if p.cover_image_url}<img
            src={p.cover_image_url}
            alt=""
            class="h-full w-full object-cover"
            loading="lazy"
          />{/if}
      </div>
      <div class="min-w-0 grow">
        <div class="font-medium truncate">{p.title}</div>
        <div class="text-xs text-base-content/60 truncate">
          /blog/{p.slug}{p.tags.length ? ` - ${p.tags.join(", ")}` : ""}
        </div>
      </div>
      <div class="flex flex-col items-end gap-1 shrink-0 text-xs">
        {#if p.status === "published" && p.published_at && p.published_at > data.now}
          <span class="badge badge-sm badge-info"
            >scheduled {formatDate(p.published_at)}</span
          >
        {:else}<StatusBadge status={p.status} />{/if}
        <span class="text-base-content/60">edited {timeAgo(p.updated_at)}</span>
      </div>
    </a>
  {:else}
    <div class="p-10 text-center">
      <p class="opacity-60 mb-3">No posts yet.</p>
      <a href="/admin/blog/new" class="btn btn-sm btn-primary"
        >Write your first post</a
      >
    </div>
  {/each}
</div>
<Pagination page={data.page} size={data.size} total={data.total} />
