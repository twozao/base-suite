<script lang="ts">
  import "../../app.css"
  import { page } from "$app/stores"
  import SiteHeader from "$lib/components/site/SiteHeader.svelte"
  import SiteFooter from "$lib/components/site/SiteFooter.svelte"
  import ChatLauncher from "$lib/components/chat/ChatLauncher.svelte"
  import { afterNavigate } from "$app/navigation"
  import { onMount } from "svelte"

  interface Props {
    children?: import("svelte").Snippet
  }
  let { children }: Props = $props()
  const site = $derived($page.data.site)

  // Cookie-free page view beacon (Analytics module). Skipped for visitors
  // with Do Not Track or Global Privacy Control turned on.
  let lastPath = ""
  // The assistant's bubble decides for itself whether this visitor may use it.
  // With live chat on too, it is the only launcher and offers "Talk to a person", which opens live chat.
  onMount(() => {
    if (!site.modules.assistant || document.getElementById("assistant-script"))
      return
    const s = document.createElement("script")
    s.id = "assistant-script"
    s.src = "/assistant/widget.js"
    s.dataset.base = "/assistant"
    if (site.modules.chat) s.dataset.handoff = "Talk to a person"
    document.body.append(s)
  })
  afterNavigate(({ from }) => {
    if (!site.modules.analytics || location.pathname === lastPath) return
    const nav = navigator as Navigator & { globalPrivacyControl?: boolean }
    if (nav.doNotTrack === "1" || nav.globalPrivacyControl) return
    lastPath = location.pathname
    const body = JSON.stringify({
      p: location.pathname,
      r: from ? "" : document.referrer,
    })
    navigator.sendBeacon?.(
      "/api/pv",
      new Blob([body], { type: "application/json" }),
    )
  })
</script>

<svelte:head>
  <meta property="og:site_name" content={site.brand.siteName} />
  {#each $page.data.jsonLd ?? [] as ld, i (i)}
    <!-- eslint-disable-next-line svelte/no-at-html-tags -->
    {@html "<" + 'script type="application/ld+json">' + ld + "</" + "script>"}
  {/each}
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
  <ChatLauncher buttonless={!!site.modules.assistant} />
{/if}
