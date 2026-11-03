<script lang="ts">
  import "../../app.css"
  import { page } from "$app/stores"
  import SiteHeader from "$lib/components/site/SiteHeader.svelte"
  import SiteFooter from "$lib/components/site/SiteFooter.svelte"
  import ChatLauncher from "$lib/components/chat/ChatLauncher.svelte"

  interface Props {
    children?: import("svelte").Snippet
  }
  let { children }: Props = $props()
  const site = $derived($page.data.site)
</script>

<svelte:head>
  <meta property="og:site_name" content={site.brand.siteName} />
  {#if site.brand.ogImageUrl}
    <meta property="og:image" content={site.brand.ogImageUrl} />
  {/if}
</svelte:head>

<a
  href="#main"
  class="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 btn btn-sm"
  >Skip to content</a
>
<SiteHeader {site} signedIn={$page.data.signedIn} />

<main id="main" class="grow">
  {@render children?.()}
</main>

<SiteFooter {site} />

{#if site.modules.chat}
  <ChatLauncher />
{/if}
