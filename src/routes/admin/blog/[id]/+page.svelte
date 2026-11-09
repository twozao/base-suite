<script lang="ts">
  import { enhance } from "$app/forms"
  import PageEditor from "$lib/components/admin/PageEditor.svelte"
  import PostFields from "$lib/components/admin/PostFields.svelte"
  import { parseBlocks } from "$lib/blocks"
  let { data, form } = $props()
  const p = $derived(data.post)
  const values = $derived(
    form && "values" in form && form.values
      ? form.values
      : {
          title: p.title,
          slug: p.slug,
          excerpt: p.excerpt ?? "",
          seo_title: p.seo_title ?? "",
          seo_description: p.seo_description ?? "",
          og_image_url: p.og_image_url ?? "",
          seo_noindex: p.seo_noindex,
          review_note: p.review_note ?? "",
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

{#key `${p.updated_at}-${!!(form && "values" in form)}`}
  <PageEditor
    notice={form && ("message" in form || "error" in form)
      ? (form as { message?: string; error?: string })
      : data.saved && !form
        ? { message: "Post created." }
        : null}
    action="?/save"
    prefix="/blog/"
    kind="post"
    {values}
    blocks={form && "values" in form && form.values
      ? parseBlocks(form.values.blocks)
      : data.blocks}
    {errors}
    canPublish={data.access.canPublish}
    status={p.status}
    reviewRequested={p.review_requested_at}
    back="/admin/blog"
    liveHref="/blog/{p.slug}"
    updatedAt={p.updated_at}
  >
    {#snippet extra()}<PostFields {values} {errors} />{/snippet}
    {#snippet panels()}
      {#if data.access.canDelete}
        <section class="card card-sm bg-base-100 border border-error/30">
          <div class="card-body gap-3">
            <h2 class="card-title text-base">Delete post</h2>
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
