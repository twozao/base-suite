<script lang="ts">
  import { enhance } from "$app/forms"
  import PageHeader from "$lib/components/admin/PageHeader.svelte"
  import Flash from "$lib/components/admin/Flash.svelte"
  import { formatDateTime } from "$lib/format"
  let { data, form } = $props()
  // svelte-ignore state_referenced_locally
  let from = $state(data.prefill)
</script>

<PageHeader
  title="Redirects"
  subtitle="Send old addresses to new ones, so links and search rankings keep working. End an address with /* to move a whole section."
/>
<Flash {form} />

<form
  method="POST"
  action="?/add"
  use:enhance
  class="card bg-base-100 border border-base-300 mb-6"
>
  <div class="card-body grid gap-2 sm:grid-cols-[1fr_1fr_9rem_auto] items-end">
    <label class="text-sm"
      >From<input
        name="from_path"
        class="input input-sm w-full font-mono"
        placeholder="/old-page"
        bind:value={from}
        maxlength="500"
        required
      /></label
    >
    <label class="text-sm"
      >To<input
        name="to_url"
        class="input input-sm w-full font-mono"
        placeholder="/new-page"
        maxlength="1000"
        required
      /></label
    >
    <label class="text-sm"
      >Type<select name="status_code" class="select select-sm w-full"
        ><option value="301">Permanent (301)</option><option value="302"
          >Temporary (302)</option
        ></select
      ></label
    >
    <button class="btn btn-primary btn-sm">Add</button>
  </div>
</form>

<div class="grid gap-6 xl:grid-cols-2">
  <section>
    <h2 class="font-semibold mb-2">Redirects ({data.redirects.length})</h2>
    <div class="overflow-x-auto rounded-box border border-base-300 bg-base-100">
      <table class="table table-sm">
        <thead><tr><th>From</th><th>To</th><th>Hits</th><th></th></tr></thead>
        <tbody>
          {#each data.redirects as r (r.id)}
            <tr>
              <td class="font-mono text-xs break-all">{r.from_path}</td>
              <td class="font-mono text-xs break-all"
                >{r.to_url} <span class="opacity-50">{r.status_code}</span></td
              >
              <td>{r.hits}</td>
              <td
                ><form method="POST" action="?/delete" use:enhance>
                  <input type="hidden" name="id" value={r.id} /><button
                    class="btn btn-ghost btn-xs text-error">Remove</button
                  >
                </form></td
              >
            </tr>
          {:else}<tr
              ><td colspan="4" class="opacity-60">No redirects yet.</td></tr
            >{/each}
        </tbody>
      </table>
    </div>
  </section>
  <section>
    <div class="mb-2 flex items-center justify-between">
      <h2 class="font-semibold">Addresses not found</h2>
      {#if data.notFound.length}<form
          method="POST"
          action="?/clear404"
          use:enhance
        >
          <button class="btn btn-ghost btn-xs">Clear list</button>
        </form>{/if}
    </div>
    <div class="overflow-x-auto rounded-box border border-base-300 bg-base-100">
      <table class="table table-sm">
        <thead
          ><tr><th>Address</th><th>Hits</th><th>Last seen</th><th></th></tr
          ></thead
        >
        <tbody>
          {#each data.notFound as n (n.path)}
            <tr>
              <td class="font-mono text-xs break-all"
                >{n.path}{#if n.referrer}<div
                    class="opacity-50 truncate max-w-xs"
                  >
                    from {n.referrer}
                  </div>{/if}</td
              >
              <td>{n.hits}</td>
              <td class="text-xs">{formatDateTime(n.last_seen)}</td>
              <td class="whitespace-nowrap"
                ><button
                  type="button"
                  class="btn btn-xs"
                  onclick={() => {
                    from = n.path
                    window.scrollTo({ top: 0 })
                  }}>Redirect</button
                >
                <form
                  method="POST"
                  action="?/clear404"
                  use:enhance
                  class="inline"
                >
                  <input type="hidden" name="path" value={n.path} /><button
                    class="btn btn-ghost btn-xs">Ignore</button
                  >
                </form></td
              >
            </tr>
          {:else}<tr
              ><td colspan="4" class="opacity-60"
                >No missing addresses recorded.</td
              ></tr
            >{/each}
        </tbody>
      </table>
    </div>
  </section>
</div>
