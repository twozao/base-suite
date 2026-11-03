<script lang="ts">
  import { page } from "$app/stores"
  import Icon from "./Icon.svelte"
  import type { PublicSite } from "$lib/site"

  let { site, signedIn }: { site: PublicSite; signedIn: boolean } = $props()
  let open = $state(false)

  const isCurrent = (href: string, path: string) =>
    href !== "/" &&
    !href.startsWith("/#") &&
    path.startsWith(href.split("#")[0])
</script>

{#if site.announcement}
  <div class="bg-primary text-primary-content text-center text-sm px-4 py-2">
    {site.announcement}
  </div>
{/if}

<header
  class="sticky top-0 z-30 border-b border-base-300/70 bg-base-100/85 backdrop-blur supports-[backdrop-filter]:bg-base-100/70"
>
  <nav
    class="mx-auto flex h-16 max-w-6xl items-center gap-6 px-4 sm:px-6"
    aria-label="Main"
  >
    <a href="/" class="flex items-center gap-2 font-bold text-lg shrink-0">
      {#if site.brand.logoUrl}
        <img src={site.brand.logoUrl} alt="" class="h-8 w-auto" />
      {:else}
        <span
          class="grid h-8 w-8 place-items-center rounded-lg bg-primary text-primary-content text-sm"
          aria-hidden="true">{site.brand.siteName.charAt(0)}</span
        >
      {/if}
      <span>{site.brand.siteName}</span>
    </a>

    <ul class="hidden md:flex items-center gap-1 text-sm font-medium">
      {#each site.navigation.header as link}
        <li>
          <a
            href={link.href}
            class="rounded-md px-3 py-2 hover:bg-base-200 {isCurrent(
              link.href,
              $page.url.pathname,
            )
              ? 'text-primary'
              : 'text-base-content/80'}">{link.label}</a
          >
        </li>
      {/each}
    </ul>

    <div class="ml-auto hidden md:flex items-center gap-2">
      <a
        href="/search"
        class="btn btn-ghost btn-sm btn-square"
        aria-label="Search"
      >
        <Icon name="search" class="h-5 w-5" />
      </a>
      {#if signedIn}
        <a href="/account" class="btn btn-ghost btn-sm">My account</a>
      {:else}
        <a href="/login/sign_in" class="btn btn-ghost btn-sm">Sign in</a>
      {/if}
      {#if site.navigation.ctaLabel && site.navigation.ctaHref}
        <a href={site.navigation.ctaHref} class="btn btn-primary btn-sm"
          >{site.navigation.ctaLabel}</a
        >
      {/if}
    </div>

    <button
      class="btn btn-ghost btn-square btn-sm ml-auto md:hidden"
      aria-label={open ? "Close menu" : "Open menu"}
      aria-expanded={open}
      aria-controls="mobile-menu"
      onclick={() => (open = !open)}
    >
      <Icon name={open ? "close" : "menu"} class="h-6 w-6" />
    </button>
  </nav>

  {#if open}
    <div
      id="mobile-menu"
      class="md:hidden border-t border-base-300 bg-base-100"
    >
      <ul class="flex flex-col p-4 gap-1 font-medium">
        {#each site.navigation.header as link}
          <li>
            <a
              href={link.href}
              class="block rounded-md px-3 py-2 hover:bg-base-200"
              onclick={() => (open = false)}>{link.label}</a
            >
          </li>
        {/each}
        <li>
          <a
            href="/search"
            class="block rounded-md px-3 py-2 hover:bg-base-200"
            onclick={() => (open = false)}>Search</a
          >
        </li>
        <li class="pt-2 flex gap-2">
          <a
            href={signedIn ? "/account" : "/login/sign_in"}
            class="btn btn-outline flex-1"
            onclick={() => (open = false)}
            >{signedIn ? "My account" : "Sign in"}</a
          >
          {#if site.navigation.ctaLabel && site.navigation.ctaHref}
            <a
              href={site.navigation.ctaHref}
              class="btn btn-primary flex-1"
              onclick={() => (open = false)}>{site.navigation.ctaLabel}</a
            >
          {/if}
        </li>
      </ul>
    </div>
  {/if}
</header>
