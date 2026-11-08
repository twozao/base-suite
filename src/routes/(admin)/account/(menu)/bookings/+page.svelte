<script lang="ts">
  import { getContext } from "svelte"
  import type { Writable } from "svelte/store"
  import StatusBadge from "$lib/components/admin/StatusBadge.svelte"
  import { formatDateTime } from "$lib/format"
  let adminSection: Writable<string> = getContext("adminSection")
  adminSection.set("bookings")
  let { data } = $props()
  const safe = (u: string | null) =>
    u && u.startsWith("https://calendly.com/") ? u : null
</script>

<svelte:head><title>My bookings</title></svelte:head>

<div class="flex flex-wrap items-end justify-between gap-4">
  <div>
    <h1 class="text-3xl font-bold tracking-tight">My bookings</h1>
    <p class="mt-1 text-base-content/70">Calls you've booked with us.</p>
  </div>
  <a href="/book" class="btn btn-primary btn-sm">Book a call</a>
</div>

<h2 class="mt-8 mb-3 font-semibold">Upcoming</h2>
<div class="space-y-3">
  {#each data.upcoming as b (b.id)}
    <div class="card bg-base-100 border border-base-300">
      <div
        class="card-body flex-row flex-wrap items-center justify-between gap-3 py-4"
      >
        <div>
          <div class="font-semibold">{b.event_name}</div>
          <div class="text-sm text-base-content/70">
            {formatDateTime(b.start_time)}
          </div>
        </div>
        <div class="flex gap-2">
          {#if b.provider === "native"}
            <a class="btn btn-sm" href="/book/manage/{b.id}"
              >Reschedule or cancel</a
            >
          {/if}
          {#if safe(b.reschedule_url)}<a
              class="btn btn-sm"
              href={safe(b.reschedule_url)}
              target="_blank"
              rel="noopener noreferrer">Reschedule</a
            >{/if}
          {#if safe(b.cancel_url)}<a
              class="btn btn-sm btn-ghost text-error"
              href={safe(b.cancel_url)}
              target="_blank"
              rel="noopener noreferrer">Cancel</a
            >{/if}
        </div>
      </div>
    </div>
  {:else}
    <p class="text-base-content/70">
      Nothing scheduled. <a class="link" href="/book">Book a call</a>.
    </p>
  {/each}
</div>

{#if data.past.length}
  <h2 class="mt-10 mb-3 font-semibold">Past & cancelled</h2>
  <div
    class="bg-base-100 border border-base-300 rounded-box divide-y divide-base-200"
  >
    {#each data.past as b (b.id)}
      <div class="flex justify-between gap-3 p-4 text-sm">
        <span>{b.event_name} - {formatDateTime(b.start_time)}</span><StatusBadge
          status={b.status}
        />
      </div>
    {/each}
  </div>
{/if}
