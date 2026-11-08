<script lang="ts">
  import Icon from "$lib/components/site/Icon.svelte"
  let { data } = $props()
  // svelte-ignore state_referenced_locally
  let selected: number | null = $state(
    data.eventTypes.length === 1 && !data.native.length ? 0 : null,
  )
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
  {#if data.native.length}
    <ul class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 mb-8">
      {#each data.native as t (t.id)}
        <li class="contents">
          <a
            href="/book/{t.slug}"
            class="group flex flex-col rounded-box border border-base-300 bg-base-100 p-6 transition hover:-translate-y-0.5 hover:border-primary hover:shadow-md"
          >
            <span class="text-lg font-bold">{t.name}</span>
            <span
              class="mt-2 flex flex-wrap gap-3 text-sm text-base-content/70"
            >
              <span class="flex items-center gap-1"
                ><Icon name="clock" class="h-4 w-4" />{t.durationMinutes} min</span
              >
              <span class="flex items-center gap-1"
                ><Icon
                  name={t.locationKind === "phone"
                    ? "phone"
                    : t.locationKind === "in_person"
                      ? "pin"
                      : "globe"}
                  class="h-4 w-4"
                />{t.locationLabel}</span
              >
            </span>
            {#if t.description}<span class="mt-3 grow text-base-content/70"
                >{t.description}</span
              >{/if}
            <span class="mt-4 flex items-center gap-1 font-medium text-primary"
              >Choose a time <Icon name="arrow" class="h-4 w-4" /></span
            >
          </a>
        </li>
      {/each}
    </ul>
  {/if}
  {#if data.eventTypes.length === 0 && !data.native.length}
    <div class="alert">
      <span>
        Online booking isn't set up yet. Please
        <a class="link" href="/contact_us">contact us</a> instead.
      </span>
    </div>
  {:else if data.eventTypes.length}
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
