<script lang="ts">
  import Scheduler from "$lib/components/booking/Scheduler.svelte"
  let { data, form } = $props()
</script>

<svelte:head>
  <title>Reschedule | {data.site.brand.siteName}</title>
  <meta name="robots" content="noindex" />
</svelte:head>

<section class="bg-brand-glow">
  <div class="mx-auto max-w-5xl px-4 sm:px-6 pt-10 pb-16 sm:pt-14">
    <a
      href={data.manage}
      class="text-sm text-base-content/60 hover:text-base-content"
      >Back to your booking</a
    >
    <h1 class="mt-3 text-3xl font-bold tracking-tight">Reschedule</h1>
    <div class="mt-4">
      <Scheduler
        type={data.type}
        hostName={data.site.brand.siteName}
        {form}
        action="?"
        rescheduleParam={data.param}
        currentTime={data.currentTime}
      />
    </div>
  </div>
</section>
