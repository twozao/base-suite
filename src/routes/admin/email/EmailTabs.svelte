<script lang="ts">
  import { page } from "$app/state"
  const tabs = [
    { href: "/admin/email", label: "Sent mail" },
    { href: "/admin/email/templates", label: "Templates" },
    { href: "/admin/email/send", label: "Send an email" },
  ]
  const active = (href: string) =>
    href === "/admin/email"
      ? page.url.pathname === href
      : page.url.pathname.startsWith(href)
</script>

<div role="tablist" class="tabs tabs-border mb-6">
  {#each tabs as t (t.href)}
    <a
      role="tab"
      href={t.href}
      class="tab {active(t.href) ? 'tab-active' : ''}"
      aria-current={active(t.href) ? "page" : undefined}>{t.label}</a
    >
  {/each}
</div>
