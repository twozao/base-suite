<script lang="ts">
  import { enhance } from "$app/forms"
  import PageHeader from "$lib/components/admin/PageHeader.svelte"
  import Flash from "$lib/components/admin/Flash.svelte"
  import { formatDateTime } from "$lib/format"
  let { data, form } = $props()
</script>

<PageHeader
  title="Reusable blocks"
  subtitle="Content kept in one place and used on many pages. Change it here and every page that uses it updates."
/>
<Flash {form} />
<form
  method="POST"
  action="?/create"
  use:enhance
  class="mb-6 flex gap-2 max-w-md"
>
  <input
    name="name"
    class="input input-sm grow"
    placeholder="Name, e.g. Footer call to action"
    maxlength="120"
    required
  />
  <button class="btn btn-primary btn-sm">Create</button>
</form>
<div class="overflow-x-auto rounded-box border border-base-300 bg-base-100">
  <table class="table">
    <thead><tr><th>Name</th><th>Updated</th></tr></thead>
    <tbody>
      {#each data.blocks as b (b.id)}
        <tr
          ><td
            ><a class="link link-hover font-medium" href="/admin/blocks/{b.id}"
              >{b.name}</a
            >{#if b.extension_id}<span class="badge badge-ghost badge-sm ml-2"
                >extension</span
              >{/if}</td
          ><td class="text-sm">{formatDateTime(b.updated_at)}</td></tr
        >
      {:else}<tr><td colspan="2" class="opacity-60">None yet.</td></tr>{/each}
    </tbody>
  </table>
</div>
