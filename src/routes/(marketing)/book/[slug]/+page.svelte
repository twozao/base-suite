<script lang="ts">
  import Scheduler from "$lib/components/booking/Scheduler.svelte"
  let { data, form } = $props()
</script>

<svelte:head>
  <title>{data.type.name} | {data.site.brand.siteName}</title>
  <meta
    name="description"
    content={data.type.description ||
      `Book a ${data.type.name} with ${data.site.brand.siteName}.`}
  />
</svelte:head>

<section class="bg-brand-glow">
  <div class="mx-auto max-w-5xl px-4 sm:px-6 pt-10 pb-16 sm:pt-14">
    <a href="/book" class="text-sm text-base-content/60 hover:text-base-content"
      >All meeting types</a
    >
    <div class="mt-4">
      <Scheduler
        type={data.type}
        hostName={data.site.brand.siteName}
        {form}
        prefill={data.prefill}
      />
    </div>
  </div>
</section>
