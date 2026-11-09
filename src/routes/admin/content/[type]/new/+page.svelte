<script lang="ts">
  import PageEditor from "$lib/components/admin/PageEditor.svelte"
  import EntryFields from "$lib/components/admin/EntryFields.svelte"
  import { parseBlocks } from "$lib/blocks"
  let { data, form } = $props()
  const empty = {
    title: "",
    slug: "",
    excerpt: "",
    seo_title: "",
    seo_description: "",
  }
  const values = $derived(form?.values ?? empty)
  const blocks = $derived(
    form?.values
      ? parseBlocks(form.values.blocks)
      : [{ type: "markdown" as const, md: "" }],
  )
</script>

{#key form}
  <PageEditor
    back="/admin/content/{data.type.slug}"
    action=""
    kind="entry"
    prefix="/{data.type.url_prefix}/"
    {values}
    {blocks}
    errors={form?.errors ?? {}}
    canPublish={data.canPublish}
  >
    {#snippet extra()}
      <EntryFields
        fields={data.type.fields}
        values={form?.values?.fields ?? {}}
        errors={form?.errors ?? {}}
        relations={data.relations}
        sortOrder={form?.values?.sort_order || "0"}
      />
    {/snippet}
  </PageEditor>
{/key}
