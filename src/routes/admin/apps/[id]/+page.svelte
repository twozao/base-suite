<script lang="ts">
  import { enhance } from "$app/forms"
  import PageHeader from "$lib/components/admin/PageHeader.svelte"
  import Flash from "$lib/components/admin/Flash.svelte"
  let { data, form } = $props()
  const a = $derived(data.app)
</script>

<PageHeader title={a.name} subtitle={a.base_url} back="/admin/apps">
  {#snippet actions()}
    <form method="POST" action="?/toggle" use:enhance>
      <button class="btn btn-sm"
        >{a.enabled ? "Switch off" : "Switch on"}</button
      >
    </form>
  {/snippet}
</PageHeader>
<Flash {form} />

<div class="grid gap-6 lg:grid-cols-[1fr_20rem]">
  <section
    class="card bg-base-100 border border-base-300 min-h-[28rem] overflow-hidden"
  >
    {#if data.frame}
      <iframe
        src={data.frame}
        title="{a.name} screen"
        class="h-[70vh] w-full border-0"
        sandbox="allow-scripts allow-forms allow-same-origin allow-popups"
        referrerpolicy="no-referrer"
      ></iframe>
    {:else}
      <div class="card-body">
        <p class="opacity-70 text-sm">
          {a.enabled
            ? "This app has no admin screen."
            : "The app is switched off."}
        </p>
      </div>
    {/if}
  </section>
  <aside class="space-y-4">
    <div class="card bg-base-100 border border-base-300">
      <div class="card-body gap-2 text-sm">
        <h2 class="font-semibold">Permissions</h2>
        <p>{a.scopes.join(", ") || "None"}</p>
        <h2 class="font-semibold mt-2">Events</h2>
        <p>{data.events.join(", ") || "None"}</p>
        <h2 class="font-semibold mt-2">Blocks</h2>
        {#each a.blocks as b (b.name)}<p>
            {b.label} <code class="text-xs">{b.name}</code>
          </p>{:else}<p class="opacity-60">None yet</p>{/each}
        <form method="POST" action="?/refresh" use:enhance>
          <button class="btn btn-xs mt-1">Ask the app for its blocks</button>
        </form>
      </div>
    </div>
    <form
      method="POST"
      action="?/delete"
      use:enhance={({ cancel }) => {
        if (!confirm(`Disconnect ${a.name}? Its token stops working.`)) cancel()
      }}
    >
      <button class="btn btn-sm btn-error btn-outline w-full"
        >Disconnect app</button
      >
    </form>
  </aside>
</div>
