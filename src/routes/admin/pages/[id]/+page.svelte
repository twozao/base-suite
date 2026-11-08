<script lang="ts">
  import { enhance } from "$app/forms"
  import PageHeader from "$lib/components/admin/PageHeader.svelte"
  import PageEditor from "$lib/components/admin/PageEditor.svelte"
  import Flash from "$lib/components/admin/Flash.svelte"
  import { formatDateTime } from "$lib/format"
  import { parseBlocks } from "$lib/blocks"
  let { data, form } = $props()
  const p = $derived(data.page)
</script>

<PageHeader
  title={p.title}
  subtitle="Last updated {formatDateTime(p.updated_at)}"
  back="/admin/pages"
>
  {#snippet actions()}
    {#if p.status === "published"}<a
        class="btn btn-sm"
        href="/{p.slug}"
        target="_blank">View live</a
      >{/if}
  {/snippet}
</PageHeader>

{#if data.saved && !form}<div role="status" class="alert alert-success mb-4">
    <span>Page created.</span>
  </div>{/if}
<Flash
  form={form && "error" in form
    ? form
    : form && "message" in form
      ? form
      : null}
/>

{#key `${p.updated_at}-${form && "values" in form}`}
  <PageEditor
    action="?/save"
    values={form && "values" in form && form.values ? form.values : p}
    blocks={form && "values" in form && form.values
      ? parseBlocks(form.values.blocks)
      : data.blocks}
    errors={form && "errors" in form ? form.errors : {}}
    canPublish={data.access.canPublish}
    status={p.status}
    reviewRequested={p.review_requested_at}
  />
{/key}

<div class="grid gap-6 lg:grid-cols-2 mt-8">
  <section class="card bg-base-100 border border-base-300">
    <div class="card-body">
      <h2 class="card-title text-base">Revision history</h2>
      <ul class="divide-y divide-base-200">
        {#each data.revisions as r, i (r.id)}
          <li class="flex items-center justify-between py-2 text-sm">
            <span
              >{formatDateTime(r.created_at)} - {r.title}{i === 0
                ? " (latest)"
                : ""}</span
            >
            {#if i > 0}
              <form method="POST" action="?/restore" use:enhance>
                <input type="hidden" name="revision" value={r.id} />
                <button class="btn btn-xs">Restore</button>
              </form>
            {/if}
          </li>
        {:else}<li class="opacity-60 text-sm py-2">No revisions yet.</li>{/each}
      </ul>
    </div>
  </section>
  {#if data.access.canDelete}
    <section class="card bg-base-100 border border-error/30">
      <div class="card-body gap-3">
        <h2 class="card-title text-base">Danger zone</h2>
        {#if p.status !== "archived"}
          <form method="POST" action="?/archive" use:enhance>
            <button class="btn btn-sm">Archive page</button>
          </form>
        {/if}
        <form
          method="POST"
          action="?/delete"
          use:enhance
          class="flex flex-wrap gap-2 items-end"
        >
          <label class="grow">
            <span class="label text-sm whitespace-normal mb-1"
              >Type <code>{p.slug}</code> to delete permanently</span
            >
            <input
              name="confirm"
              class="input input-sm w-full"
              autocomplete="off"
            />
          </label>
          <button class="btn btn-sm btn-error">Delete</button>
        </form>
      </div>
    </section>
  {/if}
</div>
