<script lang="ts">
  import PageHeader from "$lib/components/admin/PageHeader.svelte"
  import PageEditor from "$lib/components/admin/PageEditor.svelte"
  import PostFields from "$lib/components/admin/PostFields.svelte"
  import { parseBlocks } from "$lib/blocks"
  let { data, form } = $props()
  const empty = $derived({
    title: "",
    slug: "",
    excerpt: "",
    seo_title: "",
    seo_description: "",
    cover_image_url: "",
    author_name: data.author,
    tags: "",
    published_at: "",
  })
  const values = $derived(form?.values ?? empty)
  const blocks = $derived(
    form?.values
      ? parseBlocks(form.values.blocks)
      : [{ type: "markdown" as const, md: "" }],
  )
</script>

<PageHeader title="New post" back="/admin/blog" />
{#key form}
  <PageEditor
    action=""
    prefix="/blog/"
    kind="post"
    {values}
    {blocks}
    errors={form?.errors ?? {}}
    canPublish={data.canPublish}
  >
    {#snippet extra()}<PostFields
        {values}
        errors={form?.errors ?? {}}
      />{/snippet}
  </PageEditor>
{/key}
