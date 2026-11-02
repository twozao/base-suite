<script lang="ts">
  import PageHeader from "$lib/components/admin/PageHeader.svelte"
  import Pagination from "$lib/components/admin/Pagination.svelte"
  import SearchBar from "$lib/components/admin/SearchBar.svelte"
  import StatusBadge from "$lib/components/admin/StatusBadge.svelte"
  import { formatDateTime } from "$lib/format"
  let { data } = $props()
</script>

<PageHeader title="Bookings" subtitle="Meetings booked through Calendly">
  {#snippet actions()}
    <a class="btn btn-sm" href="/admin/settings#booking">Booking settings</a>
    <a
      class="btn btn-sm"
      href="https://calendly.com/app/scheduled_events/user/me"
      target="_blank"
      rel="noopener noreferrer">Calendly ↗</a
    >
  {/snippet}
</PageHeader>

{#if !data.webhookConfigured}
  <div role="alert" class="alert alert-warning mb-4">
    <span
      >Bookings appear here once <code
        >PRIVATE_CALENDLY_WEBHOOK_SIGNING_KEY</code
      >
      is set and a Calendly webhook points to
      <code>/api/webhooks/calendly</code>. See docs/MODULES.md.</span
    >
  </div>
{/if}

<div role="tablist" class="tabs tabs-box tabs-sm mb-4 w-fit">
  <a
    role="tab"
    class="tab {data.view === 'upcoming' ? 'tab-active' : ''}"
    href="?view=upcoming">Upcoming</a
  >
  <a
    role="tab"
    class="tab {data.view === 'past' ? 'tab-active' : ''}"
    href="?view=past">Past</a
  >
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
          <td class="whitespace-nowrap">{formatDateTime(b.start_time)}</td>
          <td>
            {#if b.user_id}<a class="link" href="/admin/users/{b.user_id}"
                >{b.invitee_name || b.invitee_email}</a
              >{:else}{b.invitee_name || "—"}{/if}
            <div class="text-xs opacity-60">{b.invitee_email}</div>
          </td>
          <td>{b.event_name ?? "—"}</td>
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
