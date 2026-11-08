<script lang="ts">
  import PageHeader from "$lib/components/admin/PageHeader.svelte"
  import Pagination from "$lib/components/admin/Pagination.svelte"
  import SearchBar from "$lib/components/admin/SearchBar.svelte"
  import StatusBadge from "$lib/components/admin/StatusBadge.svelte"
  import { formatDateTime } from "$lib/format"
  let { data } = $props()
</script>

<PageHeader title="Bookings" subtitle="Meetings booked on your site">
  {#snippet actions()}
    {#if data.canConfigure}
      <a class="btn btn-sm" href="/admin/bookings/event-types">Event types</a>
      <a class="btn btn-sm" href="/admin/bookings/availability">Availability</a>
    {/if}
    <a class="btn btn-sm" href="/book" target="_blank">Booking page</a>
  {/snippet}
</PageHeader>

{#if data.calendlyNeedsWebhook}
  <div role="alert" class="alert alert-warning mb-4">
    <span
      >Meetings booked through your Calendly links appear here once <code
        >PRIVATE_CALENDLY_WEBHOOK_SIGNING_KEY</code
      > is set. See docs/MODULES.md.</span
    >
  </div>
{/if}

<div role="tablist" class="tabs tabs-box tabs-sm mb-4 w-fit">
  {#each ["upcoming", "past", "canceled"] as v}
    <a
      role="tab"
      class="tab capitalize {data.view === v ? 'tab-active' : ''}"
      href="?view={v}">{v}</a
    >
  {/each}
</div>
<SearchBar q={data.q} placeholder="Search invitee or event"
  ><input type="hidden" name="view" value={data.view} /></SearchBar
>

<div class="overflow-x-auto bg-base-100 border border-base-300 rounded-box">
  <table class="table">
    <thead
      ><tr><th>When</th><th>Invitee</th><th>Event</th><th>Status</th></tr
      ></thead
    >
    <tbody>
      {#each data.rows as b (b.id)}
        <tr>
          <td class="whitespace-nowrap">
            {#if b.provider === "native"}
              <a class="link" href="/admin/bookings/{b.id}"
                >{formatDateTime(b.start_time)}</a
              >
            {:else}{formatDateTime(b.start_time)}{/if}
          </td>
          <td>
            {b.invitee_name || " - "}
            <div class="text-xs opacity-60">{b.invitee_email}</div>
          </td>
          <td>
            {b.event_name ?? " - "}
            {#if b.provider === "calendly"}<div class="text-xs opacity-60">
                Calendly
              </div>{/if}
          </td>
          <td
            ><StatusBadge status={b.status} />{#if b.cancel_reason}<div
                class="text-xs opacity-60 mt-1"
              >
                {b.cancel_reason}
              </div>{/if}</td
          >
        </tr>
      {:else}
        <tr
          ><td colspan="4" class="text-center opacity-60 py-10"
            >No {data.view} bookings.</td
          ></tr
        >
      {/each}
    </tbody>
  </table>
</div>
<Pagination page={data.page} size={data.size} total={data.total} />
