<script lang="ts">
  import { enhance } from "$app/forms"
  import PageHeader from "$lib/components/admin/PageHeader.svelte"
  import Flash from "$lib/components/admin/Flash.svelte"
  import BlockEditor from "$lib/components/admin/BlockEditor.svelte"
  import { BLOCK_TYPES, type Block } from "$lib/blocks"
  let { data, form } = $props()
  // svelte-ignore state_referenced_locally
  let blocks: Block[] = $state(structuredClone(data.blocks))
  const allowed = BLOCK_TYPES.map((t) => t.type).filter((t) => t !== "reusable")
</script>

<PageHeader title={data.block.name} back="/admin/blocks" />
<Flash {form} />
<form
  method="POST"
  action="?/save"
  use:enhance={() =>
    async ({ update }) =>
      update({ reset: false })}
  class="grid gap-6 lg:grid-cols-[1fr_18rem]"
>
  <input type="hidden" name="blocks" value={JSON.stringify(blocks)} />
  <div class="card bg-base-200/40 border border-base-300 p-3">
    <BlockEditor bind:blocks {allowed} />
  </div>
  <aside class="space-y-4">
    <div class="card bg-base-100 border border-base-300">
      <div class="card-body gap-3">
        <label class="block text-sm"
          >Name<input
            name="name"
            class="input input-sm w-full"
            value={data.block.name}
            maxlength="120"
            required
          /></label
        >
        <button class="btn btn-primary btn-sm">Save</button>
        <p class="text-xs opacity-60">
          Saving updates every page that uses this block.
        </p>
      </div>
    </div>
    <div class="card bg-base-100 border border-base-300">
      <div class="card-body gap-2">
        <h2 class="font-semibold text-sm">Used on</h2>
        {#each data.used as u (u.id)}<a
            class="link text-sm"
            href="/admin/pages/{u.id}">{u.title}</a
          >{:else}<p class="text-sm opacity-60">No pages yet.</p>{/each}
      </div>
    </div>
  </aside>
</form>
<form method="POST" action="?/delete" use:enhance class="mt-6">
  <button class="btn btn-sm btn-error btn-outline">Delete block</button>
</form>
