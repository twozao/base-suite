<script lang="ts">
  // Title, description, sharing tags, canonical address and search-engine hints for a public page.
  import { page } from "$app/stores"
  let {
    title,
    siteName,
    description = "",
    image = null,
    noindex = false,
    type = "website",
    path = null,
    alternates = [],
  }: {
    title: string
    siteName: string
    description?: string
    image?: string | null
    noindex?: boolean
    type?: string
    path?: string | null
    /** Other languages of this page, for hreflang */
    alternates?: { code: string; href: string }[]
  } = $props()
  const abs = (u: string) => (u.startsWith("/") ? `${$page.url.origin}${u}` : u)
</script>

<svelte:head>
  <title>{title} | {siteName}</title>
  {#if description}<meta name="description" content={description} />{/if}
  <meta property="og:type" content={type} />
  <meta property="og:title" content={title} />
  {#if description}<meta property="og:description" content={description} />{/if}
  {#if image}<meta property="og:image" content={abs(image)} />{/if}
  {#if noindex}<meta name="robots" content="noindex" />{/if}
  <link rel="canonical" href="{$page.url.origin}{path ?? $page.url.pathname}" />
  {#each alternates as a (a.code)}<link
      rel="alternate"
      hreflang={a.code}
      href="{$page.url.origin}{a.href}"
    />{/each}
</svelte:head>
