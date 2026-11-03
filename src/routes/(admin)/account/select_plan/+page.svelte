<script lang="ts">
  import PricingCards from "$lib/components/site/PricingCards.svelte"
  let { data } = $props()
</script>

<svelte:head>
  <title>Choose a plan</title>
</svelte:head>

<div class="min-h-screen bg-brand-glow px-4 sm:px-6 py-16">
  <div class="mx-auto max-w-6xl">
    <div class="text-center mb-12">
      <h1 class="text-3xl sm:text-4xl font-bold tracking-tight">
        Choose a plan
      </h1>
      <p class="mt-3 text-base-content/70">
        You can change or cancel any time. <a
          href="/pricing"
          class="link"
          target="_blank">Compare plans</a
        >
      </p>
    </div>
    <PricingCards plans={data.plans} />
    <p class="mt-10 text-center">
      <a href="/account" class="link">Skip for now</a>
    </p>
  </div>
</div>
