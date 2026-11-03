<script lang="ts">
  let { data } = $props()
  // svelte-ignore state_referenced_locally
  let selected: number | null = $state(data.eventTypes.length === 1 ? 0 : null)
</script>

<svelte:head>
  <title>Book a call | {data.site.brand.siteName}</title>
  <meta name="description" content={data.intro} />
</svelte:head>

<section class="bg-brand-glow">
  <div class="mx-auto max-w-5xl px-4 sm:px-6 pt-16 pb-8 sm:pt-24">
    <h1 class="text-4xl sm:text-5xl font-bold tracking-tight">Book a call</h1>
    <p class="mt-4 text-lg text-base-content/70">{data.intro}</p>
  </div>
</section>
<div class="max-w-5xl mx-auto px-4 sm:px-6 pb-12">
  {#if data.eventTypes.length === 0}
    <div class="alert">
      <span>
        Online booking isn't set up yet. Please
        <a class="link" href="/contact_us">contact us</a> instead.
      </span>
    </div>
  {:else}
    <ul class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 mb-8">
      {#each data.eventTypes as t, i}
        <li class="contents">
          <button
            type="button"
            class="card card-border text-left p-5 transition hover:shadow-md {selected ===
            i
              ? 'border-primary ring-2 ring-primary'
              : ''}"
            aria-pressed={selected === i}
            onclick={() => (selected = i)}
          >
            <div class="font-bold text-lg">{t.label}</div>
            <div class="badge badge-ghost my-2">{t.durationMinutes} min</div>
            {#if t.description}<p class="opacity-80">{t.description}</p>{/if}
          </button>
        </li>
      {/each}
    </ul>

    {#if selected !== null}
      <!-- Calendly runs in a sandboxed iframe: no third-party script on our page -->
      <iframe
        title="Schedule {data.eventTypes[selected].label}"
        src={data.eventTypes[selected].embedUrl}
        class="w-full h-[720px] rounded-box border border-base-300 bg-base-100"
        loading="lazy"
        referrerpolicy="strict-origin-when-cross-origin"
        sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox"
      ></iframe>
    {/if}
  {/if}
</div>
