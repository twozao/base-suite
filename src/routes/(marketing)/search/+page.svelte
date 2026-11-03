<script lang="ts">
  import Icon from "$lib/components/site/Icon.svelte"
  let { data } = $props()
</script>

<svelte:head>
  <title>Search | {data.site.brand.siteName}</title>
  <meta name="robots" content="noindex" />
</svelte:head>

<div class="mx-auto max-w-3xl px-4 sm:px-6 py-16">
  <h1 class="text-4xl font-bold tracking-tight">Search</h1>
  <form method="GET" class="mt-6" role="search">
    <label class="input input-lg w-full">
      <Icon name="search" class="h-5 w-5 opacity-50" />
      <!-- svelte-ignore a11y_autofocus -->
      <input
        type="search"
        name="q"
        value={data.q}
        placeholder="Search pages and posts…"
        maxlength="100"
        aria-label="Search"
        autofocus
      />
    </label>
  </form>

  {#if data.q.length >= 2}
    <p class="mt-6 text-sm text-base-content/60">
      {data.results.length} result{data.results.length === 1 ? "" : "s"} for “{data.q}”
    </p>
    <ul class="mt-4 divide-y divide-base-300">
      {#each data.results as r}
        <li class="py-5">
          <a href={r.href} class="group block">
            <span class="badge badge-ghost badge-sm">{r.kind}</span>
            <h2 class="mt-2 text-lg font-semibold group-hover:text-primary">
              {r.title}
            </h2>
            {#if r.excerpt}<p class="mt-1 text-base-content/70">
                {r.excerpt}
              </p>{/if}
          </a>
        </li>
      {:else}
        <li class="py-10 text-center text-base-content/60">
          Nothing found. Try another word.
        </li>
      {/each}
    </ul>
  {/if}
</div>
