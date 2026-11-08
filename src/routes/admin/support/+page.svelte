<script lang="ts">
  import { onMount } from "svelte"
  import { invalidate } from "$app/navigation"
  import PageHeader from "$lib/components/admin/PageHeader.svelte"
  import Pagination from "$lib/components/admin/Pagination.svelte"
  import SearchBar from "$lib/components/admin/SearchBar.svelte"
  import StatusBadge from "$lib/components/admin/StatusBadge.svelte"
  import { timeAgo } from "$lib/format"
  let { data } = $props()

  // Refresh the inbox every 15s while the tab is visible.
  onMount(() => {
    const id = setInterval(() => {
      if (!document.hidden) invalidate("admin:support")
    }, 15000)
    return () => clearInterval(id)
  })
  const filters = ["open", "mine", "unassigned", "closed", "all"]
</script>

<PageHeader
  title="Live chat"
  subtitle="Conversations from the website chat widget"
/>

<div role="tablist" class="tabs tabs-box tabs-sm mb-4 w-fit flex-wrap">
  {#each filters as f}
    <a
      role="tab"
      class="tab capitalize {data.filter === f ? 'tab-active' : ''}"
      href="?filter={f}">{f}</a
    >
  {/each}
</div>
<SearchBar q={data.q} placeholder="Search visitor name or email"
  ><input type="hidden" name="filter" value={data.filter} /></SearchBar
>

<div
  class="bg-base-100 border border-base-300 rounded-box divide-y divide-base-200"
>
  {#each data.rows as c (c.id)}
    <a
      href="/admin/support/{c.id}"
      class="flex items-center gap-4 p-4 hover:bg-base-200"
    >
      <div class="avatar avatar-placeholder">
        <div class="bg-neutral text-neutral-content w-10 rounded-full">
          <span
            >{(c.visitor_name || c.visitor_email || "?")
              .charAt(0)
              .toUpperCase()}</span
          >
        </div>
      </div>
      <div class="min-w-0 grow">
        <div
          class="font-medium truncate {c.unread_by_staff ? 'font-bold' : ''}"
        >
          {c.visitor_name || c.visitor_email || "Anonymous visitor"}
          {#if c.user_id}<span class="badge badge-xs badge-outline ml-1"
              >account</span
            >{/if}
        </div>
        <div class="text-xs opacity-60 truncate">
          {c.visitor_email ?? ""}{c.page_url ? ` - from ${c.page_url}` : ""}
        </div>
      </div>
      <div class="flex flex-col items-end gap-1 shrink-0">
        <div class="flex gap-1 items-center">
          {#if c.unread_by_staff}<span class="badge badge-primary badge-sm"
              >{c.unread_by_staff} new</span
            >{/if}
          <StatusBadge status={c.status} />
        </div>
        <span class="text-xs opacity-60"
          >{timeAgo(c.last_message_at)}{c.assigned_to === data.me
            ? " - yours"
            : ""}</span
        >
      </div>
    </a>
  {:else}
    <p class="p-10 text-center opacity-60">No conversations here.</p>
  {/each}
</div>
<Pagination page={data.page} size={data.size} total={data.total} />
