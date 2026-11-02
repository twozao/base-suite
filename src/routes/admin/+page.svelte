<script lang="ts">
  import PageHeader from "$lib/components/admin/PageHeader.svelte"
  import StatusBadge from "$lib/components/admin/StatusBadge.svelte"
  import { formatDateTime, timeAgo } from "$lib/format"
  let { data } = $props()
</script>

<PageHeader title="Dashboard" subtitle="What needs your attention today" />

<div class="grid gap-4 grid-cols-2 md:grid-cols-3 xl:grid-cols-4 mb-8">
  {#each data.stats as s}
    <a
      href={s.href}
      class="card bg-base-100 border border-base-300 p-5 hover:shadow-md transition"
    >
      <div class="text-sm opacity-70">{s.label}</div>
      <div class="text-3xl font-bold mt-1 tabular-nums">{s.value}</div>
    </a>
  {/each}
</div>

<div class="grid gap-6 lg:grid-cols-3">
  {#if data.recentChats}
    <section class="card bg-base-100 border border-base-300">
      <div class="card-body">
        <h2 class="card-title text-base">Open chats</h2>
        {#each data.recentChats as c}
          <a
            href="/admin/support/{c.id}"
            class="flex items-center justify-between gap-2 py-2 border-b border-base-200 last:border-0 hover:bg-base-200 -mx-2 px-2 rounded"
          >
            <span class="truncate"
              >{c.visitor_name || c.visitor_email || "Visitor"}</span
            >
            <span class="flex items-center gap-2 text-xs opacity-70 shrink-0">
              {#if c.unread_by_staff}<span class="badge badge-primary badge-sm"
                  >{c.unread_by_staff}</span
                >{/if}
              {timeAgo(c.last_message_at)}
            </span>
          </a>
        {:else}
          <p class="opacity-60">No open chats.</p>
        {/each}
      </div>
    </section>
  {/if}
  {#if data.recentContacts}
    <section class="card bg-base-100 border border-base-300">
      <div class="card-body">
        <h2 class="card-title text-base">Latest contact requests</h2>
        {#each data.recentContacts as c}
          <a
            href="/admin/contact/{c.id}"
            class="flex items-center justify-between gap-2 py-2 border-b border-base-200 last:border-0 hover:bg-base-200 -mx-2 px-2 rounded"
          >
            <span class="truncate">{c.first_name} {c.last_name}</span>
            <span class="flex items-center gap-2 shrink-0"
              ><StatusBadge status={c.status} /><span class="text-xs opacity-70"
                >{timeAgo(c.created_at)}</span
              ></span
            >
          </a>
        {:else}
          <p class="opacity-60">No contact requests yet.</p>
        {/each}
      </div>
    </section>
  {/if}
  {#if data.upcomingBookings}
    <section class="card bg-base-100 border border-base-300">
      <div class="card-body">
        <h2 class="card-title text-base">Upcoming bookings</h2>
        {#each data.upcomingBookings as b}
          <div class="py-2 border-b border-base-200 last:border-0">
            <div class="font-medium truncate">
              {b.invitee_name || b.invitee_email}
            </div>
            <div class="text-xs opacity-70">
              {b.event_name} · {formatDateTime(b.start_time)}
            </div>
          </div>
        {:else}
          <p class="opacity-60">Nothing scheduled.</p>
        {/each}
      </div>
    </section>
  {/if}
</div>
