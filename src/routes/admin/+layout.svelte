<script lang="ts">
  import "../../app.css"
  import { page } from "$app/stores"
  import StatusBadge from "$lib/components/admin/StatusBadge.svelte"

  let { data, children } = $props()
  let drawerOpen = $state(false)

  const isActive = (href: string, path: string) =>
    href === "/admin" ? path === "/admin" : path.startsWith(href)
</script>

<svelte:head>
  <meta name="robots" content="noindex, nofollow" />
</svelte:head>

<div class="drawer lg:drawer-open min-h-screen bg-base-200">
  <input
    id="admin-drawer"
    type="checkbox"
    class="drawer-toggle"
    bind:checked={drawerOpen}
  />
  <div class="drawer-content flex flex-col">
    <div class="navbar bg-base-100 border-b border-base-300 lg:hidden">
      <label
        for="admin-drawer"
        class="btn btn-ghost btn-square"
        aria-label="Open menu"
      >
        <svg
          class="h-5 w-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          stroke-width="2"
          aria-hidden="true"><path d="M4 6h16M4 12h16M4 18h16" /></svg
        >
      </label>
      <span class="font-bold ml-2">{data.siteName} Admin</span>
    </div>
    <main class="p-4 lg:p-8 max-w-7xl w-full">
      {@render children?.()}
    </main>
  </div>

  <div class="drawer-side z-30">
    <label for="admin-drawer" class="drawer-overlay" aria-label="Close menu"
    ></label>
    <aside
      class="w-64 min-h-full bg-base-100 border-r border-base-300 flex flex-col"
    >
      <div class="px-5 py-4 border-b border-base-300">
        <a href="/admin" class="font-bold text-lg block">{data.siteName}</a>
        <span class="text-xs uppercase tracking-wider opacity-60"
          >Admin portal</span
        >
      </div>
      <ul class="menu w-full grow gap-1 p-3">
        {#each data.nav as item}
          <li>
            <a
              href={item.href}
              class={isActive(item.href, $page.url.pathname)
                ? "menu-active"
                : ""}
              aria-current={isActive(item.href, $page.url.pathname)
                ? "page"
                : undefined}
              onclick={() => (drawerOpen = false)}
            >
              <svg
                class="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                stroke-width="1.8"
                stroke-linecap="round"
                stroke-linejoin="round"
                aria-hidden="true"><path d={item.icon} /></svg
              >
              {item.label}
              {#if data.badges[item.href]}
                <span class="badge badge-sm badge-primary ml-auto"
                  >{data.badges[item.href]}</span
                >
              {/if}
            </a>
          </li>
        {/each}
      </ul>
      <div class="p-4 border-t border-base-300 text-sm space-y-2">
        <div class="truncate opacity-80" title={data.staff.email}>
          {data.staff.email}
        </div>
        <div class="flex flex-wrap gap-1">
          {#each data.staff.roles as role}<StatusBadge status={role} />{/each}
        </div>
        <div class="flex gap-3 pt-1">
          <a class="link link-hover" href="/">View site</a>
          <a class="link link-hover" href="/account">Account</a>
          <a class="link link-hover" href="/account/sign_out">Sign out</a>
        </div>
      </div>
    </aside>
  </div>
</div>
