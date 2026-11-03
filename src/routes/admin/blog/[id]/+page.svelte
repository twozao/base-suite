<script lang="ts">
  import { enhance } from "$app/forms"
  import PageHeader from "$lib/components/admin/PageHeader.svelte"
  import PageEditor from "$lib/components/admin/PageEditor.svelte"
  import PostFields from "$lib/components/admin/PostFields.svelte"
  import Flash from "$lib/components/admin/Flash.svelte"
  import { formatDateTime } from "$lib/format"
  let { data, form } = $props()
  const p = $derived(data.post)
  const values = $derived(
    form && "values" in form && form.values
      ? form.values
      : {
          title: p.title,
          slug: p.slug,
          body_md: p.body_md,
          excerpt: p.excerpt ?? "",
          seo_title: p.seo_title ?? "",
          seo_description: p.seo_description ?? "",
          cover_image_url: p.cover_image_url ?? "",
          author_name: p.author_name ?? "",
          tags: p.tags.join(", "),
          published_at: p.published_at ?? "",
        },
  )
  const errors = $derived(
    form && "errors" in form && form.errors ? form.errors : {},
  )
</script>

<PageHeader
  title={p.title}
  subtitle="Last updated {formatDateTime(p.updated_at)}"
  back="/admin/blog"
>
  {#snippet actions()}
    {#if p.status === "published"}<a
        class="btn btn-sm"
        href="/blog/{p.slug}"
        target="_blank">View live ↗</a
      >{/if}
  {/snippet}
</PageHeader>

{#if data.saved && !form}<div role="status" class="alert alert-success mb-4">
    <span>Post created.</span>
  </div>{/if}
<Flash
  form={form && ("message" in form || "error" in form)
    ? (form as { message?: string; error?: string })
    : null}
/>

{#key `${p.updated_at}-${!!(form && "values" in form)}`}
  <PageEditor
    action="?/save"
    prefix="/blog/"
    {values}
    {errors}
    canPublish={data.canPublish}
    status={p.status}
  >
    {#snippet extra()}<PostFields {values} {errors} />{/snippet}
  </PageEditor>
{/key}

{#if data.canPublish}
  <section class="card bg-base-100 border border-error/30 mt-8 max-w-xl">
    <div class="card-body gap-3">
      <h2 class="card-title text-base">Delete post</h2>
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
