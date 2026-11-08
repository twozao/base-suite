<script lang="ts">
  import PageHeader from "$lib/components/admin/PageHeader.svelte"
  import Pagination from "$lib/components/admin/Pagination.svelte"
  import StatusBadge from "$lib/components/admin/StatusBadge.svelte"
  import { formatDate } from "$lib/format"
  let { data } = $props()
</script>

<PageHeader title="Subscriptions" subtitle="Synced from Stripe via webhook">
  {#snippet actions()}
    <a
      class="btn btn-sm"
      href="https://dashboard.stripe.com/subscriptions"
      target="_blank"
      rel="noopener noreferrer">Open Stripe</a
    >
  {/snippet}
</PageHeader>

{#if !data.webhookConfigured}
  <div role="alert" class="alert alert-warning mb-4">
    <span
      >Set <code>PRIVATE_STRIPE_WEBHOOK_SECRET</code> and add a Stripe webhook
      to <code>/api/webhooks/stripe</code> to sync subscriptions here.</span
    >
  </div>
{/if}

<div
  class="stats stats-vertical sm:stats-horizontal bg-base-100 border border-base-300 mb-6 w-full sm:w-auto"
>
  {#each data.byPlan as p}
    <div class="stat">
      <div class="stat-title">{p.plan}</div>
      <div class="stat-value text-2xl">{p.count}</div>
      <div class="stat-desc">active</div>
    </div>
  {:else}
    <div class="stat">
      <div class="stat-title">Active</div>
      <div class="stat-value text-2xl">0</div>
    </div>
  {/each}
</div>

<div role="tablist" class="tabs tabs-box tabs-sm mb-4 w-fit flex-wrap">
  <a role="tab" class="tab {data.status === '' ? 'tab-active' : ''}" href="?"
    >All</a
  >
  {#each data.statuses as s}
    <a
      role="tab"
      class="tab capitalize {data.status === s ? 'tab-active' : ''}"
      href="?status={s}">{s.replace("_", " ")}</a
    >
  {/each}
</div>

<div class="overflow-x-auto bg-base-100 border border-base-300 rounded-box">
  <table class="table">
    <thead
      ><tr
        ><th>Subscription</th><th>Plan</th><th>Status</th><th>Period end</th><th
          >User</th
        ></tr
      ></thead
    >
    <tbody>
      {#each data.rows as s (s.id)}
        <tr>
          <td
            ><a
              class="font-mono text-xs link"
              href="https://dashboard.stripe.com/subscriptions/{s.id}"
              target="_blank"
              rel="noopener noreferrer">{s.id}</a
            ></td
          >
          <td>{s.plan}</td>
          <td
            ><StatusBadge status={s.status} />{#if s.cancel_at_period_end}<span
                class="badge badge-sm badge-outline ml-1">cancels</span
              >{/if}</td
          >
          <td class="whitespace-nowrap">{formatDate(s.current_period_end)}</td>
          <td
            >{#if s.user_id}<a class="link" href="/admin/users/{s.user_id}"
                >View</a
              >{:else}<span class="opacity-50">Unlinked</span>{/if}</td
          >
        </tr>
      {:else}
        <tr
          ><td colspan="5" class="text-center opacity-60 py-10"
            >No subscriptions.</td
          ></tr
        >
      {/each}
    </tbody>
  </table>
</div>
<Pagination page={data.page} size={data.size} total={data.total} />
