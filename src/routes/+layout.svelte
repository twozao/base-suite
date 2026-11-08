<script lang="ts">
  import "../app.css"
  import { beforeNavigate } from "$app/navigation"
  import { navigating } from "$app/stores"
  import { expoOut } from "svelte/easing"
  import { slide } from "svelte/transition"
  interface Props {
    children?: import("svelte").Snippet
  }

  let { children }: Props = $props()
  import { page } from "$app/stores"
  const site = $derived($page.data.site)
  // A failed client request can lose the root layout data, and later pages would crash without it.
  // This layout is always mounted, so it leaves that state with a full page load from the server.
  beforeNavigate(({ cancel, to, willUnload }) => {
    if (site || !to || willUnload) return
    cancel()
    location.assign(to.url)
  })
  // Built as a string so the CSS preprocessor doesn't try to parse it
  const STYLE_OPEN = "<" + "style>"
  const STYLE_CLOSE = "</" + "style>"
</script>

<svelte:head>
  {#if site}
    <!-- Brand colours from Admin -> Site (validated hex values) -->
    <!-- eslint-disable-next-line svelte/no-at-html-tags -->
    {@html STYLE_OPEN + site.themeCss + STYLE_CLOSE}
    <meta name="theme-color" content={site.brand.primaryColor} />
  {/if}
</svelte:head>

{#if $navigating}
  <!-- 
    Loading animation for next page since svelte doesn't show any indicator. 
     - delay 100ms because most page loads are instant, and we don't want to flash 
     - long 12s duration because we don't actually know how long it will take
     - exponential easing so fast loads (>100ms and <1s) still see enough progress,
       while slow networks see it moving for a full 12 seconds
  -->
  <div
    class="fixed w-full top-0 right-0 left-0 h-1 z-50 bg-primary"
    in:slide={{ delay: 100, duration: 12000, axis: "x", easing: expoOut }}
  ></div>
{/if}
{@render children?.()}
