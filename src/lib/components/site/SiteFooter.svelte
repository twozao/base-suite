<script lang="ts">
  import type { PublicSite } from "$lib/site"
  import NewsletterSignup from "./NewsletterSignup.svelte"
  let { site }: { site: PublicSite } = $props()

  const SOCIAL: Record<string, { label: string; path: string }> = {
    x: { label: "X", path: "M4 4l16 16M20 4L4 20" },
    linkedin: {
      label: "LinkedIn",
      path: "M6 9v11M6 5v.01M10 20v-6a3 3 0 016 0v6M10 9v11",
    },
    github: {
      label: "GitHub",
      path: "M9 19c-4 1.3-4-2-6-2.5M15 21v-3.5c0-1 .1-1.4-.5-2 2.8-.3 5.5-1.4 5.5-6a4.6 4.6 0 00-1.3-3.2 4.2 4.2 0 00-.1-3.2s-1-.3-3.4 1.3a11.5 11.5 0 00-6.2 0C6.6 2.8 5.6 3.1 5.6 3.1a4.2 4.2 0 00-.1 3.2A4.6 4.6 0 004.2 9.5c0 4.6 2.7 5.7 5.5 6-.6.6-.6 1.2-.5 2V21",
    },
    instagram: {
      label: "Instagram",
      path: "M7 3h10a4 4 0 014 4v10a4 4 0 01-4 4H7a4 4 0 01-4-4V7a4 4 0 014-4zm9 4.5v.01M12 16a4 4 0 100-8 4 4 0 000 8z",
    },
    facebook: {
      label: "Facebook",
      path: "M14 8h3V4h-3a4 4 0 00-4 4v3H7v4h3v6h4v-6h3l1-4h-4V8z",
    },
    youtube: {
      label: "YouTube",
      path: "M3 8a3 3 0 013-3h12a3 3 0 013 3v8a3 3 0 01-3 3H6a3 3 0 01-3-3V8zm7 1v6l5-3-5-3z",
    },
  }
  const year = new Date().getFullYear()
</script>

<footer class="border-t border-base-300 bg-base-200/50 mt-24">
  {#if site.modules.newsletter}
    <div class="border-b border-base-300">
      <div
        class="mx-auto max-w-6xl px-4 sm:px-6 py-10 flex flex-col md:flex-row md:items-center md:justify-between gap-4"
      >
        <div>
          <h2 class="font-semibold text-lg">
            Get updates from {site.brand.siteName}
          </h2>
          <p class="text-sm text-base-content/70">
            News and guides in your inbox. Unsubscribe any time.
          </p>
        </div>
        <NewsletterSignup source="footer" compact />
      </div>
    </div>
  {/if}
  <div
    class="mx-auto max-w-6xl px-4 sm:px-6 py-14 flex flex-col gap-10 md:flex-row md:justify-between"
  >
    <div class="max-w-sm">
      <a href="/" class="flex items-center gap-2 font-bold text-lg">
        {#if site.brand.logoUrl}
          <img src={site.brand.logoUrl} alt="" class="h-8 w-auto" />
        {:else}
          <span
            class="grid h-8 w-8 place-items-center rounded-lg bg-primary text-primary-content text-sm"
            aria-hidden="true">{site.brand.siteName.charAt(0)}</span
          >
        {/if}
        {site.brand.siteName}
      </a>
      {#if site.brand.tagline}
        <p class="mt-3 text-sm text-base-content/70">{site.brand.tagline}</p>
      {/if}
      {#if site.navigation.social.length}
        <ul class="mt-5 flex gap-2">
          {#each site.navigation.social as s}
            <li>
              <a
                href={s.url}
                class="btn btn-ghost btn-sm btn-square"
                aria-label={SOCIAL[s.platform]?.label}
                target="_blank"
                rel="noopener noreferrer"
              >
                <svg
                  class="h-5 w-5"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="1.8"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  aria-hidden="true"><path d={SOCIAL[s.platform]?.path} /></svg
                >
              </a>
            </li>
          {/each}
        </ul>
      {/if}
    </div>
    {#each site.navigation.footerColumns as col}
      <nav aria-label={col.title}>
        <h2 class="text-sm font-semibold">{col.title}</h2>
        <ul class="mt-3 space-y-2 text-sm">
          {#each col.links as link}
            <li>
              <a
                href={link.href}
                data-sveltekit-reload={link.href.endsWith(".xml")
                  ? ""
                  : undefined}
                class="text-base-content/70 hover:text-base-content"
                >{link.label}</a
              >
            </li>
          {/each}
        </ul>
      </nav>
    {/each}
  </div>
  <div class="border-t border-base-300">
    <div
      class="mx-auto max-w-6xl px-4 sm:px-6 py-6 flex flex-wrap gap-2 justify-between text-sm text-base-content/60"
    >
      <span>(c) {year} {site.brand.siteName}. {site.navigation.footerNote}</span
      >
      <a
        href="/sitemap.xml"
        data-sveltekit-reload
        class="hover:text-base-content">Sitemap</a
      >
    </div>
  </div>
</footer>
