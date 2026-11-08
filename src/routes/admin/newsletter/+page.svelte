<script lang="ts">
  import { enhance } from "$app/forms"
  import PageHeader from "$lib/components/admin/PageHeader.svelte"
  import Pagination from "$lib/components/admin/Pagination.svelte"
  import SearchBar from "$lib/components/admin/SearchBar.svelte"
  import StatusBadge from "$lib/components/admin/StatusBadge.svelte"
  import Flash from "$lib/components/admin/Flash.svelte"
  import { formatDate } from "$lib/format"
  let { data, form } = $props()
</script>

<PageHeader
  title="Newsletter"
  subtitle="Double opt-in subscribers from your site's signup forms."
>
  {#snippet actions()}<a
      class="btn btn-sm"
      href="/admin/newsletter/export.csv"
      download>Export CSV</a
    >{/snippet}
</PageHeader>
<Flash {form} />

<div
  class="stats stats-vertical sm:stats-horizontal bg-base-100 border border-base-300 mb-6 w-full"
>
  <div class="stat">
    <div class="stat-title">Subscribers</div>
    <div class="stat-value text-2xl">{data.stats.confirmed}</div>
    <div class="stat-desc">+{data.stats.last30} in 30 days</div>
  </div>
  <div class="stat">
    <div class="stat-title">Awaiting confirmation</div>
    <div class="stat-value text-2xl">{data.stats.pending}</div>
  </div>
  <div class="stat">
    <div class="stat-title">Unsubscribed</div>
    <div class="stat-value text-2xl">{data.stats.unsubscribed}</div>
  </div>
</div>

<p class="text-sm text-base-content/70 mb-4">
  Export to send with Mailchimp, Brevo or Resend Broadcasts. Built-in campaigns
  are on the roadmap (see Modules).
</p>

<div role="tablist" class="tabs tabs-box tabs-sm mb-4 w-fit">
  {#each [["confirmed", "Confirmed"], ["pending", "Pending"], ["unsubscribed", "Unsubscribed"], ["all", "All"]] as [v, label]}
    <a
      role="tab"
      class="tab {data.status === v ? 'tab-active' : ''}"
      href="?status={v}">{label}</a
    >
  {/each}
</div>
<SearchBar q={data.q} placeholder="Search email or name"
  ><input type="hidden" name="status" value={data.status} /></SearchBar
>

<div class="overflow-x-auto bg-base-100 border border-base-300 rounded-box">
  <table class="table">
    <thead
      ><tr
        ><th>Email</th><th>Status</th><th>Source</th><th>Signed up</th><th
        ></th></tr
      ></thead
    >
    <tbody>
      {#each data.rows as r (r.id)}
        <tr>
          <td
            ><div class="font-medium">{r.email}</div>
            {#if r.name}<div class="text-xs text-base-content/60">
                {r.name}
              </div>{/if}</td
          >
          <td
            ><StatusBadge
              status={r.status === "confirmed"
                ? "active"
                : r.status === "unsubscribed"
                  ? "canceled"
                  : "pending"}
            /></td
          >
          <td class="text-sm">{r.source ?? " - "}</td>
          <td class="text-sm whitespace-nowrap">{formatDate(r.created_at)}</td>
          <td class="text-right">
            <form
              method="POST"
              action="?/delete"
              use:enhance={({ cancel }) => {
                if (!confirm(`Delete ${r.email}? This can't be undone.`))
                  cancel()
              }}
            >
              <input type="hidden" name="id" value={r.id} /><button
                class="btn btn-ghost btn-xs text-error">Delete</button
              >
            </form>
          </td>
        </tr>
      {:else}
        <tr
          ><td colspan="5" class="text-center opacity-60 py-10"
            >No subscribers here yet.</td
          ></tr
        >
      {/each}
    </tbody>
  </table>
</div>
<Pagination page={data.page} size={data.size} total={data.total} />
