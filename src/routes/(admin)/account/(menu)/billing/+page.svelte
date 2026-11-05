<script lang="ts">
  import { getContext } from "svelte"
  import type { Writable } from "svelte/store"
  import SettingsModule from "../settings/settings_module.svelte"
  import PricingCards from "$lib/components/site/PricingCards.svelte"

  let adminSection: Writable<string> = getContext("adminSection")
  adminSection.set("billing")

  let { data } = $props()

  let currentPlanId = $derived(data.currentPlanId)
  let currentPlanName = $derived(data.currentPlanName)
</script>

<svelte:head>
  <title>Billing</title>
</svelte:head>

<h1 class="text-2xl font-bold mb-2">
  {data.isActiveCustomer ? "Billing" : "Select a Plan"}
</h1>
<div>
  View our <a href="/pricing" target="_blank" class="link">pricing page</a> for details.
</div>

{#if data.billingUnavailable}
  <div role="alert" class="alert alert-warning mt-6 max-w-xl">
    <span
      >Online payment is not set up on this site yet, so plans cannot be started
      here. Please contact us to subscribe.</span
    >
  </div>
{/if}

{#if !data.isActiveCustomer}
  <div class="mt-8">
    <PricingCards plans={data.plans} {currentPlanId} />
  </div>

  {#if data.hasEverHadSubscription}
    <div class="mt-10">
      <a href="/account/billing/manage" class="link">View past invoices</a>
    </div>
  {/if}
{:else}
  <SettingsModule
    title="Subscription"
    editable={false}
    fields={[
      {
        id: "plan",
        label: "Current Plan",
        initialValue: currentPlanName || "",
      },
    ]}
    editButtonTitle="Manage Subscription"
    editLink="/account/billing/manage"
  />
{/if}
