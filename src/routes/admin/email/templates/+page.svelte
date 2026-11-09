<script lang="ts">
  import PageHeader from "$lib/components/admin/PageHeader.svelte"
  import { formatDateTime } from "$lib/format"
  import EmailTabs from "../EmailTabs.svelte"
  let { data } = $props()
</script>

<PageHeader
  title="Email"
  subtitle="Change the emails the site sends, or add your own. Extensions can add templates too."
>
  {#snippet actions()}<a
      href="/admin/email/templates/new"
      class="btn btn-primary btn-sm">New template</a
    >{/snippet}
</PageHeader>
<EmailTabs />

<h2 class="font-semibold mb-2">Sent by the site</h2>
<ul class="grid gap-3 md:grid-cols-2 xl:grid-cols-3 mb-8">
  {#each data.builtIn as t (t.slug)}
    <li class="card bg-base-100 border border-base-300">
      <div class="card-body gap-1 p-4">
        <h3 class="font-semibold">
          <a href="/admin/email/templates/{t.slug}" class="link link-hover"
            >{t.name}</a
          >
          {#if t.customized}<span class="badge badge-sm badge-primary"
              >customized</span
            >{/if}
        </h3>
        <p class="text-sm opacity-70">{t.description}</p>
        <p class="font-mono text-xs opacity-60">{t.slug}</p>
      </div>
    </li>
  {/each}
</ul>

<h2 class="font-semibold mb-2">Your templates</h2>
<div class="overflow-x-auto rounded-box border border-base-300 bg-base-100">
  <table class="table table-sm">
    <thead><tr><th>Name</th><th>Id</th><th>From</th><th>Updated</th></tr></thead
    >
    <tbody>
      {#each data.custom as t (t.slug)}
        <tr>
          <td
            ><a href="/admin/email/templates/{t.slug}" class="link link-hover"
              >{t.name}</a
            >
            {#if t.description}<p class="text-xs opacity-60">
                {t.description}
              </p>{/if}</td
          >
          <td class="font-mono text-xs">{t.slug}</td>
          <td class="text-xs"
            >{#if t.extension_id}<span class="badge badge-sm badge-ghost"
                >extension: {t.extension_id}</span
              >{:else}You{/if}</td
          >
          <td class="text-xs whitespace-nowrap"
            >{formatDateTime(t.updated_at)}</td
          >
        </tr>
      {:else}
        <tr
          ><td colspan="4" class="opacity-60"
            >None yet. Create one, or install an extension that adds some.</td
          ></tr
        >
      {/each}
    </tbody>
  </table>
</div>
