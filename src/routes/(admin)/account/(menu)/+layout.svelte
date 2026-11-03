<script lang="ts">
  import "../../../../app.css"
  import { writable } from "svelte/store"
  import { setContext } from "svelte"
  import { page } from "$app/stores"
  import Icon from "$lib/components/site/Icon.svelte"
  import ChatLauncher from "$lib/components/chat/ChatLauncher.svelte"

  interface Props {
    children?: import("svelte").Snippet
  }
  let { children }: Props = $props()

  // Child pages set their section for the active menu highlight.
  const adminSectionStore = writable("")
  setContext("adminSection", adminSectionStore)
  let adminSection: string | undefined = $state()
  adminSectionStore.subscribe((value) => {
    adminSection = value
  })

  let drawerOpen = $state(false)
  const site = $derived($page.data.site)
  const items = $derived(
    [
      {
        id: "home",
        href: "/account",
        label: "Overview",
        icon: "layers",
        show: true,
      },
      {
        id: "billing",
        href: "/account/billing",
        label: "Billing",
        icon: "card",
        show: site?.modules.subscriptions,
      },
      {
        id: "bookings",
        href: "/account/bookings",
        label: "My bookings",
        icon: "calendar",
        show: site?.modules.booking,
      },
      {
        id: "support",
        href: "/account/support",
        label: "Support",
        icon: "chat",
        show: site?.modules.chat,
      },
      {
        id: "settings",
        href: "/account/settings",
        label: "Settings",
        icon: "shield",
        show: true,
      },
    ].filter((i) => i.show),
  )
</script>

<div class="drawer lg:drawer-open min-h-screen bg-base-200">
  <input
    id="account-drawer"
    type="checkbox"
    class="drawer-toggle"
    bind:checked={drawerOpen}
  />
  <div class="drawer-content flex flex-col">
    <div class="navbar bg-base-100 border-b border-base-300 lg:hidden">
      <label
        for="account-drawer"
        class="btn btn-ghost btn-square"
        aria-label="Open menu"><Icon name="menu" class="h-5 w-5" /></label
      >
      <a href="/" class="font-bold ml-2">{site?.brand.siteName}</a>
    </div>
    <main class="p-4 lg:p-10 max-w-5xl w-full">
      {@render children?.()}
    </main>
  </div>

  <div class="drawer-side z-30">
    <label for="account-drawer" class="drawer-overlay" aria-label="Close menu"
    ></label>
    <aside
      class="w-64 min-h-full bg-base-100 border-r border-base-300 flex flex-col"
    >
      <a
        href="/"
        class="flex items-center gap-2 px-5 py-4 border-b border-base-300 font-bold text-lg"
      >
        {#if site?.brand.logoUrl}<img
            src={site.brand.logoUrl}
            alt=""
            class="h-7 w-auto"
          />{:else}<span
            class="grid h-7 w-7 place-items-center rounded-md bg-primary text-primary-content text-xs"
            >{site?.brand.siteName.charAt(0)}</span
          >{/if}
        {site?.brand.siteName}
      </a>
      <ul class="menu w-full grow gap-0.5 p-3">
        {#each items as item}
          <li>
            <a
              href={item.href}
              class={adminSection === item.id ? "menu-active" : ""}
              aria-current={adminSection === item.id ? "page" : undefined}
              onclick={() => (drawerOpen = false)}
            >
              <Icon name={item.icon} class="h-5 w-5" />{item.label}
            </a>
          </li>
        {/each}
        {#if $page.data.isStaff}
          <li class="mt-4">
            <a href="/admin" class="font-semibold text-primary"
              ><Icon name="lock" class="h-5 w-5" />Admin portal</a
            >
          </li>
        {/if}
      </ul>
      <div class="p-4 border-t border-base-300 text-sm space-y-2">
        <div
          class="truncate text-base-content/70"
          title={$page.data.user?.email}
        >
          {$page.data.user?.email}
        </div>
        <div class="flex gap-3">
          <a class="link link-hover" href="/">Back to site</a><a
            class="link link-hover"
            href="/account/sign_out">Sign out</a
          >
        </div>
      </div>
    </aside>
  </div>
</div>

{#if site?.modules.chat}
  <ChatLauncher />
{/if}
