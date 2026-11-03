<script lang="ts">
  import { enhance } from "$app/forms"
  import PageHeader from "$lib/components/admin/PageHeader.svelte"
  import Pagination from "$lib/components/admin/Pagination.svelte"
  import SearchBar from "$lib/components/admin/SearchBar.svelte"
  import StatusBadge from "$lib/components/admin/StatusBadge.svelte"
  import Flash from "$lib/components/admin/Flash.svelte"
  import { timeAgo } from "$lib/format"
  let { data, form } = $props()
  let adding = $state(false)
  const SOURCE: Record<string, string> = {
    contact_form: "Contact form",
    chat: "Live chat",
    booking: "Booking",
    newsletter: "Newsletter",
    manual: "Added manually",
    signup: "Sign-up",
  }
</script>

<PageHeader
  title="CRM contacts"
  subtitle="Everyone who's reached out — captured automatically from forms, chats, bookings and signups."
>
  {#snippet actions()}
    <a href="/admin/crm/deals" class="btn btn-sm">Deals pipeline</a>
    <button class="btn btn-primary btn-sm" onclick={() => (adding = !adding)}
      >New contact</button
    >
  {/snippet}
</PageHeader>
<Flash {form} />

<div
  class="stats stats-vertical sm:stats-horizontal bg-base-100 border border-base-300 mb-6 w-full"
>
  <div class="stat">
    <div class="stat-title">Open leads</div>
    <div class="stat-value text-2xl">{data.stats.leads}</div>
  </div>
  <div class="stat">
    <div class="stat-title">Customers</div>
    <div class="stat-value text-2xl">{data.stats.customers}</div>
  </div>
  <div class="stat">
    <div class="stat-title">New this week</div>
    <div class="stat-value text-2xl">{data.stats.newThisWeek}</div>
  </div>
</div>

{#if adding}
  <form
    method="POST"
    action="?/create"
    use:enhance
    class="card bg-base-100 border border-base-300 mb-6"
  >
    <div class="card-body grid gap-3 sm:grid-cols-2">
      <input
        class="input w-full"
        name="name"
        placeholder="Name"
        maxlength="200"
      />
      <input
        class="input w-full"
        name="email"
        type="email"
        placeholder="Email"
        maxlength="320"
      />
      <input
        class="input w-full"
        name="company"
        placeholder="Company"
        maxlength="200"
      />
      <input
        class="input w-full"
        name="phone"
        placeholder="Phone"
        maxlength="60"
      />
      <div class="sm:col-span-2 flex gap-2">
        <button class="btn btn-primary btn-sm">Create contact</button><button
          type="button"
          class="btn btn-ghost btn-sm"
          onclick={() => (adding = false)}>Cancel</button
        >
      </div>
    </div>
  </form>
{/if}

<div role="tablist" class="tabs tabs-box tabs-sm mb-4 w-fit">
  {#each [["", "Active"], ["lead", "Leads"], ["customer", "Customers"], ["archived", "Archived"]] as [v, label]}
    <a
      role="tab"
      class="tab {data.status === v ? 'tab-active' : ''}"
      href="?status={v}">{label}</a
    >
  {/each}
</div>
<SearchBar q={data.q} placeholder="Search name, email or company"
  ><input type="hidden" name="status" value={data.status} /></SearchBar
>

<div class="overflow-x-auto bg-base-100 border border-base-300 rounded-box">
  <table class="table">
    <thead
      ><tr
        ><th>Contact</th><th>Company</th><th>Status</th><th>Source</th><th
          >Last activity</th
        ></tr
      ></thead
    >
    <tbody>
      {#each data.rows as c (c.id)}
        <tr class="hover:bg-base-200">
          <td>
            <a class="font-medium link link-hover" href="/admin/crm/{c.id}"
              >{c.name || c.email}</a
            >
            {#if c.name && c.email}<div class="text-xs text-base-content/60">
                {c.email}
              </div>{/if}
          </td>
          <td>{c.company ?? "—"}</td>
          <td><StatusBadge status={c.status} /></td>
          <td class="text-sm">{SOURCE[c.source ?? ""] ?? c.source ?? "—"}</td>
          <td class="whitespace-nowrap text-sm"
            >{timeAgo(c.last_activity_at)}</td
          >
        </tr>
      {:else}
        <tr
          ><td colspan="5" class="text-center opacity-60 py-10"
            >No contacts yet. They'll appear here when someone uses the contact
            form, chat, booking or newsletter.</td
          ></tr
        >
      {/each}
    </tbody>
  </table>
</div>
<Pagination page={data.page} size={data.size} total={data.total} />
