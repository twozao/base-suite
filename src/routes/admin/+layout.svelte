<script lang="ts">
  import "../../app.css"
  import { page } from "$app/stores"
  import { onMount } from "svelte"
  import { activeNavHref } from "$lib/modules"
  import StatusBadge from "$lib/components/admin/StatusBadge.svelte"

  let { data, children } = $props()
  let drawerOpen = $state(false)

  // Groups fold so a site with many modules stays readable; the choice is remembered per browser.
  const COLLAPSED_KEY = "admin-nav-collapsed"
  const FOLD_ABOVE = 14
  const activeHref = $derived(
    activeNavHref(
      data.nav.map((i) => i.href),
      $page.url.pathname,
    ),
  )
  const groups = $derived.by(() => {
    const out: { name: string; items: typeof data.nav }[] = []
    // One section per group, in the order groups first appear, wherever their items are listed.
    for (const item of data.nav) {
      const g = out.find((x) => x.name === item.group)
      if (g) g.items.push(item)
      else out.push({ name: item.group, items: [item] })
    }
    return out
  })
  let userChoice = $state<Record<string, boolean>>({})
  onMount(() => {
    try {
      userChoice = JSON.parse(localStorage.getItem(COLLAPSED_KEY) ?? "{}")
    } catch {
      /* private window or blocked storage */
    }
  })
  const isOpen = (group: { name: string; items: { href: string }[] }) => {
    if (group.name === "Overview") return true
    if (group.items.some((i) => i.href === activeHref)) return true
    return userChoice[group.name] ?? data.nav.length <= FOLD_ABOVE
  }
  const toggle = (group: { name: string; items: { href: string }[] }) => {
    userChoice = { ...userChoice, [group.name]: !isOpen(group) }
    try {
      localStorage.setItem(COLLAPSED_KEY, JSON.stringify(userChoice))
    } catch {
      /* private window or blocked storage */
    }
  }
  const badgeTotal = (items: { href: string }[]) =>
    items.reduce((n, i) => n + (data.badges[i.href] ?? 0), 0)
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
        <a href="/admin" class="font-bold text-lg flex items-center gap-2"
          ><span
            class="grid h-7 w-7 place-items-center rounded-md bg-primary text-primary-content text-xs"
            >{data.siteName.charAt(0)}</span
          >{data.siteName}</a
        >
        <span class="text-xs uppercase tracking-wider opacity-60"
          >Admin portal</span
        >
      </div>
      <ul class="menu w-full grow gap-0.5 p-3">
        {#each groups as group (group.name)}
          {@const open = isOpen(group)}
          {#if group.name !== "Overview"}
            <li class="mt-2">
              <button
                type="button"
                class="flex w-full items-center justify-between text-xs uppercase tracking-wider text-base-content/60"
                aria-expanded={open}
                onclick={() => toggle(group)}
              >
                <span>{group.name}</span>
                <span class="flex items-center gap-2">
                  {#if !open && badgeTotal(group.items)}
                    <span class="badge badge-xs badge-primary"
                      >{badgeTotal(group.items)}</span
                    >
                  {/if}
                  <svg
                    class="h-3.5 w-3.5 transition-transform {open
                      ? 'rotate-90'
                      : ''}"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    stroke-width="2.5"
                    aria-hidden="true"><path d="M9 6l6 6-6 6" /></svg
                  >
                </span>
              </button>
            </li>
          {/if}
          {#if open}
            {#each group.items as item (item.href)}
              <li>
                <a
                  href={item.href}
                  class={item.href === activeHref ? "side-nav-active" : ""}
                  aria-current={item.href === activeHref ? "page" : undefined}
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
          {/if}
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
