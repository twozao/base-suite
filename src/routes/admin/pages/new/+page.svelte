<script lang="ts">
  import PageHeader from "$lib/components/admin/PageHeader.svelte"
  import PageEditor from "$lib/components/admin/PageEditor.svelte"
  let { data, form } = $props()
  const empty = {
    title: "",
    slug: "",
    body_md: "",
    excerpt: null,
    seo_title: null,
    seo_description: null,
  }
</script>

<PageHeader title="New page" back="/admin/pages" />
{#key form}
  <PageEditor
    action=""
    values={form?.values ?? empty}
    errors={form?.errors ?? {}}
    canPublish={data.canPublish}
  />
{/key}
