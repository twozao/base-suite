<script lang="ts">
  import { getContext } from "svelte"
  import type { Writable } from "svelte/store"
  import Icon from "$lib/components/site/Icon.svelte"
  import { formatDate, formatDateTime, timeAgo } from "$lib/format"

  let adminSection: Writable<string> = getContext("adminSection")
  adminSection.set("home")
  let { data } = $props()
  const firstName = $derived((data.profile?.full_name ?? "").split(" ")[0])
</script>

<svelte:head><title>My account | {data.site.brand.siteName}</title></svelte:head
>

<h1 class="text-3xl font-bold tracking-tight">
  Welcome{firstName ? `, ${firstName}` : ""}
</h1>
<p class="mt-1 text-base-content/70">
  Everything about your account in one place.
</p>

<div class="mt-8 grid gap-6 md:grid-cols-2">
  {#if data.site.modules.subscriptions}
    <section class="card bg-base-100 border border-base-300">
      <div class="card-body">
        <h2 class="card-title text-base">
          <Icon name="card" class="h-5 w-5 text-primary" />Your plan
        </h2>
        {#if data.subscription}
          <p>
            <span class="badge badge-success">{data.subscription.status}</span>
          </p>
          <p class="text-sm text-base-content/70">
            {data.subscription.cancel_at_period_end ? "Ends" : "Renews"} on {formatDate(
              data.subscription.current_period_end,
            )}
          </p>
          <div class="card-actions mt-2">
            <a href="/account/billing" class="btn btn-sm">Manage billing</a>
          </div>
        {:else}
          <p class="text-base-content/70">You're on the free plan.</p>
          <div class="card-actions mt-2">
            <a href="/account/billing" class="btn btn-primary btn-sm"
              >See plans</a
            >
          </div>
        {/if}
      </div>
    </section>
  {/if}

  {#if data.site.modules.booking}
    <section class="card bg-base-100 border border-base-300">
      <div class="card-body">
        <h2 class="card-title text-base">
          <Icon name="calendar" class="h-5 w-5 text-primary" />Upcoming bookings
        </h2>
        {#each data.upcoming as b (b.id)}
          <div class="flex justify-between gap-2 text-sm py-1">
            <span class="font-medium">{b.event_name}</span><span
              class="text-base-content/70">{formatDateTime(b.start_time)}</span
            >
          </div>
        {:else}
          <p class="text-base-content/70">No upcoming calls.</p>
        {/each}
        <div class="card-actions mt-2">
          <a href="/book" class="btn btn-sm">Book a call</a
          >{#if data.upcoming.length}<a
              href="/account/bookings"
              class="btn btn-ghost btn-sm">All bookings</a
            >{/if}
        </div>
      </div>
    </section>
  {/if}

  {#if data.site.modules.chat}
    <section class="card bg-base-100 border border-base-300">
      <div class="card-body">
        <h2 class="card-title text-base">
          <Icon name="chat" class="h-5 w-5 text-primary" />Support
        </h2>
        {#if data.chat}
          <p class="text-sm">
            Last message {timeAgo(data.chat.last_message_at)}
            {#if data.chat.unread_by_visitor}<span
                class="badge badge-primary badge-sm ml-1"
                >{data.chat.unread_by_visitor} new repl{data.chat
                  .unread_by_visitor === 1
                  ? "y"
                  : "ies"}</span
              >{/if}
          </p>
          <div class="card-actions mt-2">
            <a href="/account/support" class="btn btn-sm">Open conversation</a>
          </div>
        {:else}
          <p class="text-base-content/70">
            Questions? Our team is a message away.
          </p>
          <div class="card-actions mt-2">
            <a href="/account/support" class="btn btn-sm">Contact support</a>
          </div>
        {/if}
      </div>
    </section>
  {/if}

  <section class="card bg-base-100 border border-base-300">
    <div class="card-body">
      <h2 class="card-title text-base">
        <Icon name="shield" class="h-5 w-5 text-primary" />Profile & security
      </h2>
      <p class="text-sm text-base-content/70">{data.user?.email}</p>
      <div class="card-actions mt-2">
        <a href="/account/settings" class="btn btn-sm">Account settings</a>
      </div>
    </div>
  </section>
</div>
