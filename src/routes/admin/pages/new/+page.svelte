<script lang="ts">
  import PageHeader from "$lib/components/admin/PageHeader.svelte"
  import PageEditor from "$lib/components/admin/PageEditor.svelte"
  import { parseBlocks } from "$lib/blocks"
  let { data, form } = $props()
  const empty = {
    title: "",
    slug: "",
    excerpt: null,
    seo_title: null,
    seo_description: null,
    template: "default",
  }
  const values = $derived(form?.values ?? empty)
  const blocks = $derived(
    form?.values
      ? parseBlocks(form.values.blocks)
      : [{ type: "markdown" as const, md: "" }],
  )
</script>

<PageHeader title="New page" back="/admin/pages" />
{#key form}
  <PageEditor
    action=""
    {values}
    {blocks}
    errors={form?.errors ?? {}}
    canPublish={data.canPublish}
  />
{/key}
