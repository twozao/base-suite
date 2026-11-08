<script lang="ts">
  import { enhance } from "$app/forms"
  import PageHeader from "$lib/components/admin/PageHeader.svelte"
  import PageEditor from "$lib/components/admin/PageEditor.svelte"
  import EntryFields from "$lib/components/admin/EntryFields.svelte"
  import Flash from "$lib/components/admin/Flash.svelte"
  import { parseBlocks } from "$lib/blocks"
  import { formatDateTime } from "$lib/format"
  let { data, form } = $props()
  const e = $derived(data.entry)
  const echoed = $derived(
    form && "values" in form && form.values ? form.values : null,
  )
</script>

<PageHeader
  title={e.title}
  subtitle="Last updated {formatDateTime(e.updated_at)}"
  back="/admin/content/{data.type.slug}"
>
  {#snippet actions()}{#if e.status === "published"}<a
        class="btn btn-sm"
        href="/{data.type.url_prefix}/{e.slug}"
        target="_blank">View live</a
      >{/if}{/snippet}
</PageHeader>
{#if data.saved && !form}<div role="status" class="alert alert-success mb-4">
    <span>{data.type.singular} created.</span>
  </div>{/if}
<Flash
  form={form && ("message" in form || "error" in form)
    ? (form as { message?: string; error?: string })
    : null}
/>

{#key `${e.updated_at}-${!!echoed}`}
  <PageEditor
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
  </PageEditor>
{/key}

{#if data.access.canDelete}
  <form
    method="POST"
    action="?/delete"
    use:enhance
    class="card bg-base-100 border border-error/30 mt-8 max-w-xl"
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
