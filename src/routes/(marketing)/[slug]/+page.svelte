<script lang="ts">
  import SeoHead from "$lib/components/site/SeoHead.svelte"
  let { data } = $props()
</script>

{#if data.kind === "page"}
  {@const p = data.page}
  <SeoHead
    title={p.metaTitle}
    siteName={data.site.brand.siteName}
    description={p.metaDescription}
    image={p.image}
    noindex={p.noindex}
    alternates={data.alternates}
  />
  <article>
    {#if p.template !== "landing"}
      <header class="bg-brand-glow">
        <div
          class="mx-auto {p.template === 'wide'
            ? 'max-w-6xl'
            : 'max-w-3xl'} px-4 sm:px-6 pt-16 pb-10 sm:pt-24"
        >
          <h1 class="text-4xl sm:text-5xl font-bold tracking-tight">
            {p.title}
          </h1>
          {#if p.excerpt}
            <p class="mt-5 text-lg text-base-content/70 leading-relaxed">
              {p.excerpt}
            </p>
          {/if}
        </div>
      </header>
    {/if}
    <div
      class="prose prose-lg mx-auto {p.template === 'default'
        ? 'max-w-3xl'
        : 'max-w-6xl'} px-4 sm:px-6 {p.template === 'landing'
        ? 'py-16'
        : 'pb-16'} prose-a:text-primary prose-img:rounded-box"
    >
      <!-- Sanitised at save time by $lib/server/cms/blocks -->
      <!-- eslint-disable-next-line svelte/no-at-html-tags -->
      {@html p.html}
    </div>
  </article>
{:else}
  <SeoHead
    title={data.type.name}
    siteName={data.site.brand.siteName}
    description={data.type.description ?? ""}
  />
  <section class="bg-brand-glow">
    <div class="mx-auto max-w-6xl px-4 sm:px-6 pt-16 pb-10 sm:pt-24">
      <h1 class="text-4xl sm:text-5xl font-bold tracking-tight">
        {data.type.name}
      </h1>
      {#if data.type.description}
        <p class="mt-5 max-w-2xl text-lg text-base-content/70">
          {data.type.description}
        </p>
      {/if}
    </div>
  </section>
  <div class="mx-auto max-w-6xl px-4 sm:px-6 pb-16">
    {#if !data.entries.length}
      <p class="text-base-content/70">Nothing here yet.</p>
    {:else}
      <ul class="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {#each data.entries as e (e.slug)}
          <li
            class="card bg-base-100 border border-base-300 overflow-hidden hover:shadow-md transition-shadow"
          >
            <a href="/{data.type.prefix}/{e.slug}" class="flex h-full flex-col">
              {#if e.image}
                <img
                  src={e.image}
                  alt=""
                  class="aspect-[16/10] w-full object-cover"
                  loading="lazy"
                />
              {/if}
              <div class="card-body gap-2">
                <h2 class="card-title text-lg">{e.title}</h2>
                {#each e.listFields as f (f.label)}
                  <p class="text-sm">
                    <span class="text-base-content/60">{f.label}:</span>
                    {f.value}
                  </p>
                {/each}
                {#if e.excerpt}<p class="text-sm text-base-content/70">
                    {e.excerpt}
                  </p>{/if}
              </div>
            </a>
          </li>
        {/each}
      </ul>
      {#if data.pages > 1}
        <nav class="join mt-10 flex justify-center" aria-label="Pages">
          {#each Array.from({ length: data.pages }, (_, i) => i + 1) as n (n)}
            <a
              class="join-item btn btn-sm {n === data.pageNo
                ? 'btn-active'
                : ''}"
              href="?page={n}">{n}</a
            >
          {/each}
        </nav>
      {/if}
    {/if}
  </div>
{/if}
