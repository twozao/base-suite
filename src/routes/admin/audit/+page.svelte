<script lang="ts">
  import PageHeader from "$lib/components/admin/PageHeader.svelte"
  import Pagination from "$lib/components/admin/Pagination.svelte"
  import { formatDateTime } from "$lib/format"
  let { data } = $props()
  const targetHref = (type: string | null, id: string | null) =>
    !id
      ? null
      : type === "user"
        ? `/admin/users/${id}`
        : type === "page"
          ? `/admin/pages/${id}`
          : type === "chat"
            ? `/admin/support/${id}`
            : type === "contact_request"
              ? `/admin/contact/${id}`
              : null
</script>

<PageHeader
  title="Audit log"
  subtitle="Every administrative change, newest first"
/>
{#if data.action}
  <p class="mb-4">
    Filtered by <code>{data.action}</code> - <a class="link" href="?">clear</a>
  </p>
{/if}

<div class="overflow-x-auto bg-base-100 border border-base-300 rounded-box">
  <table class="table table-sm">
    <thead
      ><tr
        ><th>When</th><th>Who</th><th>Action</th><th>Target</th><th>Details</th
        ><th>IP</th></tr
      ></thead
    >
    <tbody>
      {#each data.rows as r (r.id)}
        {@const href = targetHref(r.target_type, r.target_id)}
        <tr>
          <td class="whitespace-nowrap">{formatDateTime(r.created_at)}</td>
          <td
            >{r.actor_id
              ? (data.emails[r.actor_id] ?? r.actor_id.slice(0, 8))
              : "system"}</td
          >
          <td
            ><a
              class="badge badge-ghost badge-sm font-mono"
              href="?action={encodeURIComponent(r.action)}">{r.action}</a
            ></td
          >
          <td
            >{#if href}<a class="link text-xs" {href}>{r.target_type}</a
              >{:else}<span class="text-xs opacity-60"
                >{r.target_type ?? ""}</span
              >{/if}</td
          >
          <td
            class="font-mono text-xs max-w-xs truncate"
            title={JSON.stringify(r.meta)}>{JSON.stringify(r.meta)}</td
          >
          <td class="font-mono text-xs opacity-60">{r.ip}</td>
        </tr>
      {:else}
        <tr
          ><td colspan="6" class="text-center opacity-60 py-10"
            >Nothing logged yet.</td
          ></tr
        >
      {/each}
    </tbody>
  </table>
</div>
<Pagination page={data.page} size={data.size} total={data.total} />
