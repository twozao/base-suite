<script lang="ts">
  import { WebsiteName } from "../../../config"
  let { data } = $props()
</script>

<svelte:head>
  <title>{data.page.metaTitle} | {WebsiteName}</title>
  <meta name="description" content={data.page.metaDescription} />
  <meta property="og:title" content={data.page.metaTitle} />
  <meta property="og:description" content={data.page.metaDescription} />
</svelte:head>

<article class="prose prose-lg mx-auto px-6 py-12 max-w-3xl">
  <h1>{data.page.title}</h1>
  <!-- Sanitised at save time by $lib/server/cms/markdown -->
  <!-- eslint-disable-next-line svelte/no-at-html-tags -->
  {@html data.page.html}
</article>
