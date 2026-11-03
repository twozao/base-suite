<script lang="ts">
  import PricingCards from "$lib/components/site/PricingCards.svelte"
  import Faq from "$lib/components/site/Faq.svelte"
  let { data } = $props()
</script>

<svelte:head>
  <title>Pricing | {data.site.brand.siteName}</title>
  <meta
    name="description"
    content={data.pricing.subtitle ||
      `Plans and pricing for ${data.site.brand.siteName}`}
  />
</svelte:head>

<section class="bg-brand-glow">
  <div class="mx-auto max-w-6xl px-4 sm:px-6 pt-16 pb-20 sm:pt-24">
    <div class="mx-auto max-w-2xl text-center mb-14">
      <h1 class="text-4xl sm:text-5xl font-bold tracking-tight">
        {data.pricing.title}
      </h1>
      {#if data.pricing.subtitle}<p class="mt-4 text-lg text-base-content/70">
          {data.pricing.subtitle}
        </p>{/if}
    </div>
    <PricingCards plans={data.plans} />
  </div>
</section>

{#if data.pricing.faq.length}
  <section class="mx-auto max-w-3xl px-4 sm:px-6 py-16">
    <h2 class="text-2xl font-bold mb-6 text-center">Pricing questions</h2>
    <Faq items={data.pricing.faq} />
    <p class="mt-10 text-center text-base-content/70">
      Still have questions? <a class="link link-primary" href="/contact_us"
        >Talk to us</a
      >.
    </p>
  </section>
{/if}
