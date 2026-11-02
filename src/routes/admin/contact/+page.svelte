<script lang="ts">
  import PageHeader from "$lib/components/admin/PageHeader.svelte"
  import Pagination from "$lib/components/admin/Pagination.svelte"
  import SearchBar from "$lib/components/admin/SearchBar.svelte"
  import StatusBadge from "$lib/components/admin/StatusBadge.svelte"
  import { timeAgo } from "$lib/format"
  let { data } = $props()
</script>

<PageHeader title="Contact inbox" subtitle="Messages from the contact form" />

<div role="tablist" class="tabs tabs-box tabs-sm mb-4 w-fit">
  {#each [...data.statuses, "all"] as s}
    <a
      role="tab"
      class="tab capitalize {data.status === s ? 'tab-active' : ''}"
      href="?status={s}">{s}</a
    >
  {/each}
</div>
<SearchBar q={data.q} placeholder="Search name, email or company">
  <input type="hidden" name="status" value={data.status} />
</SearchBar>

<div
  class="bg-base-100 border border-base-300 rounded-box divide-y divide-base-200"
>
  {#each data.rows as r (r.id)}
    <a href="/admin/contact/{r.id}" class="flex gap-4 p-4 hover:bg-base-200">
      <div class="min-w-0 grow">
        <div class="flex items-center gap-2">
          <span class="font-medium {r.status === 'new' ? 'font-bold' : ''}"
            >{r.first_name} {r.last_name}</span
          >
          <span class="text-sm opacity-60 truncate">{r.email}</span>
        </div>
        <p class="text-sm opacity-80 truncate">
          {r.message_body || "(no message)"}
        </p>
      </div>
      <div class="flex flex-col items-end gap-1 shrink-0">
        <StatusBadge status={r.status} />
        <span class="text-xs opacity-60">{timeAgo(r.created_at)}</span>
      </div>
    </a>
  {:else}
    <p class="p-10 text-center opacity-60">Inbox zero.</p>
  {/each}
</div>
<Pagination page={data.page} size={data.size} total={data.total} />
