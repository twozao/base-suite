<script lang="ts">
  import { enhance } from "$app/forms"
  import PageEditor from "$lib/components/admin/PageEditor.svelte"
  import EntryFields from "$lib/components/admin/EntryFields.svelte"
  import { parseBlocks } from "$lib/blocks"
  let { data, form } = $props()
  const e = $derived(data.entry)
  const echoed = $derived(
    form && "values" in form && form.values ? form.values : null,
  )
</script>

{#key `${e.updated_at}-${!!echoed}`}
  <PageEditor
    notice={form && ("message" in form || "error" in form)
      ? (form as { message?: string; error?: string })
      : data.saved && !form
        ? { message: `${data.type.singular} created.` }
        : null}
    action="?/save"
    kind="entry"
    prefix="/{data.type.url_prefix}/"
    values={echoed ?? e}
    blocks={echoed ? parseBlocks(echoed.blocks) : data.blocks}
    errors={form && "errors" in form
      ? (form.errors as Record<string, string>)
      : {}}
    canPublish={data.access.canPublish}
    status={e.status}
    reviewRequested={e.review_requested_at}
    back="/admin/content/{data.type.slug}"
    liveHref="/{data.type.url_prefix}/{e.slug}"
    updatedAt={e.updated_at}
  >
    {#snippet extra()}
      <EntryFields
        fields={data.type.fields}
        values={echoed?.fields ?? data.fields}
        errors={form && "errors" in form
          ? (form.errors as Record<string, string>)
          : {}}
        relations={data.relations}
        sortOrder={echoed?.sort_order ?? String(e.sort_order)}
      />
    {/snippet}
    {#snippet panels()}
      {#if data.access.canDelete}
        <form
          method="POST"
          action="?/delete"
          use:enhance
          class="card card-sm bg-base-100 border border-error/30"
        >
          <div class="card-body gap-2">
            <h2 class="card-title text-base">
              Delete {data.type.singular.toLowerCase()}
            </h2>
            <input
              name="confirm"
              class="input input-sm w-full"
              placeholder="Type {e.slug} to delete permanently"
              autocomplete="off"
            />
            <button class="btn btn-sm btn-error w-fit">Delete</button>
          </div>
        </form>
      {/if}
    {/snippet}
  </PageEditor>
{/key}
