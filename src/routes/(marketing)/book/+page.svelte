<script lang="ts">
  import { WebsiteName } from "../../../config"
  let { data } = $props()
  // svelte-ignore state_referenced_locally
  let selected: number | null = $state(data.eventTypes.length === 1 ? 0 : null)
</script>

<svelte:head>
  <title>Book a call | {WebsiteName}</title>
  <meta name="description" content={data.intro} />
</svelte:head>

<div class="max-w-5xl mx-auto px-6 py-12">
  <h1 class="text-4xl font-bold mb-3">Book a call</h1>
  <p class="text-lg opacity-80 mb-8">{data.intro}</p>

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
