<script lang="ts">
  import { enhance } from "$app/forms"
  import PageEditor from "$lib/components/admin/PageEditor.svelte"
  import { formatDateTime } from "$lib/format"
  import { parseBlocks } from "$lib/blocks"
  let { data, form } = $props()
  const p = $derived(data.page)
</script>

{#key `${p.updated_at}-${form && "values" in form}`}
  <PageEditor
    notice={form && "error" in form
      ? form
      : form && "message" in form
        ? form
        : data.saved && !form
          ? { message: "Page created." }
          : null}
    action="?/save"
    values={form && "values" in form && form.values ? form.values : p}
    blocks={form && "values" in form && form.values
      ? parseBlocks(form.values.blocks)
      : data.blocks}
    errors={form && "errors" in form ? form.errors : {}}
    canPublish={data.access.canPublish}
    status={p.status}
    reviewRequested={p.review_requested_at}
    back="/admin/pages"
    liveHref="/{p.slug}"
    updatedAt={p.updated_at}
  >
    {#snippet panels()}
      <section class="card bg-base-100 border border-base-300 card-sm">
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
            {:else}<li class="opacity-60 text-sm py-2">
                No revisions yet.
              </li>{/each}
          </ul>
        </div>
      </section>
      {#if data.access.canDelete}
        <section class="card bg-base-100 border border-error/30 card-sm">
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
                <span class="mb-1 block text-sm"
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
    {/snippet}
  </PageEditor>
{/key}
