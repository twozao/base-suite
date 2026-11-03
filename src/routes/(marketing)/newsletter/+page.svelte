<script lang="ts">
  import NewsletterSignup from "$lib/components/site/NewsletterSignup.svelte"
  let { data, form } = $props()
</script>

<svelte:head><title>Newsletter | {data.site.brand.siteName}</title></svelte:head
>

<section class="bg-brand-glow min-h-[60vh] grid place-items-center px-4 py-20">
  <div class="max-w-lg w-full text-center">
    <h1 class="text-4xl font-bold tracking-tight">Stay in the loop</h1>
    <p class="mt-3 text-base-content/70">
      News and guides from {data.site.brand.siteName}. No spam, unsubscribe any
      time.
    </p>
    <div class="mt-8"><NewsletterSignup {form} source="newsletter-page" /></div>
  </div>
</section>
