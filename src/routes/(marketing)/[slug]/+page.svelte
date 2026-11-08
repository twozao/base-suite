<script lang="ts">
  let { data } = $props()
</script>

<svelte:head>
  <title>{data.page.metaTitle} | {data.site.brand.siteName}</title>
  <meta name="description" content={data.page.metaDescription} />
  <meta property="og:title" content={data.page.metaTitle} />
  <meta property="og:description" content={data.page.metaDescription} />
</svelte:head>

<article>
  <header class="bg-brand-glow">
    <div class="mx-auto max-w-3xl px-4 sm:px-6 pt-16 pb-10 sm:pt-24">
      <h1 class="text-4xl sm:text-5xl font-bold tracking-tight">
        {data.page.title}
      </h1>
      {#if data.page.excerpt}
        <p class="mt-5 text-lg text-base-content/70 leading-relaxed">
          {data.page.excerpt}
        </p>
      {/if}
    </div>
  </header>
  <div
    class="prose prose-lg mx-auto max-w-3xl px-4 sm:px-6 pb-16 prose-a:text-primary prose-img:rounded-box"
  >
    <!-- Sanitised at save time by $lib/server/cms/markdown -->
    <!-- eslint-disable-next-line svelte/no-at-html-tags -->
    {@html data.page.html}
  </div>
</article>
