<script lang="ts">
  import { enhance } from "$app/forms"
  import PageHeader from "$lib/components/admin/PageHeader.svelte"
  import Flash from "$lib/components/admin/Flash.svelte"
  import { formatDateTime } from "$lib/format"
  let { data, form } = $props()
</script>

<PageHeader
  title="Extensions"
  subtitle="Add features without code. Extensions are packages of content types, blocks and settings: they cannot run code, so they cannot break into the site."
/>
<Flash {form} />

{#if data.installed.length}
  <h2 class="font-semibold mb-2">Installed</h2>
  <ul class="grid gap-4 md:grid-cols-2 mb-8">
    {#each data.installed as x (x.id)}
      <li class="card bg-base-100 border border-base-300">
        <div class="card-body gap-2">
          <h3 class="card-title text-base">
            {x.name} <span class="badge badge-ghost badge-sm">{x.version}</span>
          </h3>
          <p class="text-sm opacity-70">{x.description}</p>
          <p class="text-xs opacity-60">
            Installed {formatDateTime(x.installed_at)}
          </p>
          <div class="flex flex-wrap gap-2">
            <form
              method="POST"
              action="?/uninstall"
              use:enhance={({ cancel }) => {
                if (
                  !confirm(
                    `Remove ${x.name} and everything it added, including its entries?`,
                  )
                )
                  cancel()
              }}
            >
              <input type="hidden" name="id" value={x.id} /><button
                class="btn btn-xs btn-error btn-outline"
                >Remove with content</button
              >
            </form>
            <form method="POST" action="?/uninstall" use:enhance>
              <input type="hidden" name="id" value={x.id} /><input
                type="hidden"
                name="keep"
                value="1"
              /><button class="btn btn-xs">Remove, keep content</button>
            </form>
          </div>
        </div>
      </li>
    {/each}
  </ul>
{/if}

<h2 class="font-semibold mb-2">Available</h2>
<ul class="grid gap-4 md:grid-cols-2 xl:grid-cols-3 mb-8">
  {#each data.available as x (x.id)}
    <li class="card bg-base-100 border border-base-300">
      <div class="card-body gap-2">
        <h3 class="card-title text-base">{x.name}</h3>
        <p class="text-sm opacity-70">{x.description}</p>
        {#if x.adds.length}<ul class="text-xs opacity-70 list-disc pl-4">
            {#each x.adds as a (a)}<li>{a}</li>{/each}
          </ul>{/if}
        <form method="POST" action="?/install" use:enhance>
          <input type="hidden" name="id" value={x.id} /><button
            class="btn btn-primary btn-sm">Install</button
          >
        </form>
      </div>
    </li>
  {:else}<li class="opacity-60 text-sm">
      Everything in the catalogue is installed.
    </li>{/each}
</ul>

<form
  method="POST"
  action="?/install"
  enctype="multipart/form-data"
  use:enhance
  class="card bg-base-100 border border-base-300 max-w-xl"
>
  <div class="card-body gap-2">
    <h2 class="card-title text-base">Install from a file</h2>
    <p class="text-sm opacity-70">
      An extension package is a JSON file. See docs/EXTENDING.md for the format.
    </p>
    <input
      type="file"
      name="file"
      accept="application/json,.json"
      class="file-input file-input-sm w-full"
      required
    />
    <button class="btn btn-sm w-fit">Install package</button>
  </div>
</form>
