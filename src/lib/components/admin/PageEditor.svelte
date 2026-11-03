<script lang="ts">
  import { enhance } from "$app/forms"
  import type { Snippet } from "svelte"

  type Values = {
    title: string
    slug: string
    body_md: string
    excerpt: string | null
    seo_title: string | null
    seo_description: string | null
  }
  let {
    values,
    errors = {},
    canPublish,
    status = "draft",
    action,
    prefix = "/",
    extra,
  }: {
    values: Values
    errors?: Record<string, string>
    canPublish: boolean
    status?: string
    action: string
    /** URL prefix shown before the slug ("/" for pages, "/blog/" for posts) */
    prefix?: string
    /** Extra sidebar fields (e.g. blog cover image, tags) */
    extra?: Snippet
  } = $props()

  // The editor is re-mounted (via {#key}) when the server returns new values,
  // so capturing the initial props here is intentional.
  // svelte-ignore state_referenced_locally
  let title = $state(values.title)
  // svelte-ignore state_referenced_locally
  let slug = $state(values.slug)
  // svelte-ignore state_referenced_locally
  let slugTouched = $state(!!values.slug)
  // svelte-ignore state_referenced_locally
  let body = $state(values.body_md)
  let tab: "write" | "preview" = $state("write")
  let previewHtml = $state("")
  let previewing = $state(false)
  let dirty = $state(false)

  const autoSlug = (t: string) =>
    t
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 100)

  $effect(() => {
    if (!slugTouched) slug = autoSlug(title)
  })

  // Preview is rendered by the server with the exact same sanitiser used on
  // save, so what you see is what will be published.
  async function showPreview() {
    tab = "preview"
    previewing = true
    try {
      const fd = new FormData()
      fd.set("body_md", body)
      const res = await fetch("/admin/pages/preview", {
        method: "POST",
        body: fd,
      })
      previewHtml = res.ok ? (await res.json()).html : "<p>Preview failed</p>"
    } finally {
      previewing = false
    }
  }

  function beforeUnload(e: BeforeUnloadEvent) {
    if (dirty) e.preventDefault()
  }
</script>

<svelte:window onbeforeunload={beforeUnload} />

<form
  method="POST"
  {action}
  class="grid gap-6 lg:grid-cols-[1fr_20rem]"
  oninput={() => (dirty = true)}
  use:enhance={() => {
    return async ({ update }) => {
      dirty = false
      await update({ reset: false })
    }
  }}
>
  <div class="space-y-4">
    <label class="block">
      <span class="label text-sm whitespace-normal mb-1">Title</span>
      <input
        name="title"
        class="input w-full text-lg {errors.title ? 'input-error' : ''}"
        bind:value={title}
        maxlength="200"
        required
      />
      {#if errors.title}<span class="text-error text-sm">{errors.title}</span
        >{/if}
    </label>

    <div class="card bg-base-100 border border-base-300">
      <div role="tablist" class="tabs tabs-border px-2">
        <button
          type="button"
          role="tab"
          class="tab {tab === 'write' ? 'tab-active' : ''}"
          aria-selected={tab === "write"}
          onclick={() => (tab = "write")}>Write</button
        >
        <button
          type="button"
          role="tab"
          class="tab {tab === 'preview' ? 'tab-active' : ''}"
          aria-selected={tab === "preview"}
          onclick={showPreview}>Preview</button
        >
      </div>
      <div class="p-3" class:hidden={tab !== "write"}>
        <textarea
          name="body_md"
          class="textarea w-full min-h-[50vh] font-mono text-sm leading-relaxed {errors.body_md
            ? 'textarea-error'
            : ''}"
          bind:value={body}
          maxlength="200000"
          placeholder="Write in Markdown. # Heading, **bold**, [link](https://…), ![image](https://…)"
        ></textarea>
        {#if errors.body_md}<span class="text-error text-sm"
            >{errors.body_md}</span
          >{/if}
        <p class="text-xs opacity-60 mt-1">
          Markdown supported. HTML is sanitised: scripts, iframes and inline
          styles are removed.
        </p>
      </div>
      {#if tab === "preview"}
        <div class="p-6 min-h-[50vh]">
          {#if previewing}<span class="loading loading-dots"></span>{:else}
            <article class="prose max-w-none">
              <!-- eslint-disable-next-line svelte/no-at-html-tags -->
              {@html previewHtml}
            </article>
          {/if}
        </div>
      {/if}
    </div>
  </div>

  <aside class="space-y-4">
    <div class="card bg-base-100 border border-base-300">
      <div class="card-body gap-3">
        <div class="flex items-center justify-between">
          <span class="text-sm opacity-70">Status</span>
          <span
            class="badge {status === 'published'
              ? 'badge-success'
              : 'badge-ghost'}">{status}</span
          >
        </div>
        <button name="intent" value="draft" class="btn btn-sm w-full"
          >{status === "published" ? "Save & unpublish" : "Save draft"}</button
        >
        {#if canPublish}
          <button
            name="intent"
            value="publish"
            class="btn btn-primary btn-sm w-full"
            >{status === "published" ? "Update live page" : "Publish"}</button
          >
        {/if}
        {#if errors._}<p class="text-error text-sm">{errors._}</p>{/if}
      </div>
    </div>

    <div class="card bg-base-100 border border-base-300">
      <div class="card-body gap-3">
        <label class="block">
          <span class="label text-sm whitespace-normal mb-1">URL</span>
          <div class="join w-full">
            <span class="join-item btn btn-sm btn-disabled no-animation"
              >{prefix}</span
            >
            <input
              name="slug"
              class="join-item input input-sm w-full font-mono {errors.slug
                ? 'input-error'
                : ''}"
              bind:value={slug}
              oninput={() => (slugTouched = true)}
              maxlength="100"
              pattern="[a-z0-9]+(-[a-z0-9]+)*"
            />
          </div>
          {#if errors.slug}<span class="text-error text-sm">{errors.slug}</span
            >{/if}
        </label>
        {@render extra?.()}
        <label class="block">
          <span class="label text-sm whitespace-normal mb-1">Excerpt</span>
          <textarea
            name="excerpt"
            class="textarea textarea-sm w-full h-20"
            maxlength="500">{values.excerpt ?? ""}</textarea
          >
        </label>
        <details
          class="collapse collapse-arrow border border-base-300 rounded-box"
        >
          <summary class="collapse-title text-sm font-medium min-h-0 py-2"
            >SEO</summary
          >
          <div class="collapse-content space-y-2">
            <input
              name="seo_title"
              class="input input-sm w-full"
              placeholder="SEO title (defaults to title)"
              maxlength="200"
              value={values.seo_title ?? ""}
            />
            <textarea
              name="seo_description"
              class="textarea textarea-sm w-full h-20"
              placeholder="Meta description (defaults to excerpt)"
              maxlength="500">{values.seo_description ?? ""}</textarea
            >
          </div>
        </details>
      </div>
    </div>
  </aside>
</form>
