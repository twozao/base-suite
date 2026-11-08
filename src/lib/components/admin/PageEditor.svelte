<script lang="ts">
  import { enhance } from "$app/forms"
  import type { Snippet } from "svelte"
  import { publishProblems, type Block } from "$lib/blocks"
  import BlockEditor from "./BlockEditor.svelte"
  import ImageField from "./ImageField.svelte"

  type Values = {
    title: string
    slug: string
    excerpt: string | null
    seo_title: string | null
    seo_description: string | null
    og_image_url?: string | null
    seo_noindex?: string | number | boolean | null
    template?: string
    review_note?: string | null
  }
  let {
    values,
    blocks: initialBlocks,
    errors = {},
    canPublish,
    status = "draft",
    reviewRequested = null,
    action,
    prefix = "/",
    kind = "page",
    extra,
  }: {
    values: Values
    blocks: Block[]
    errors?: Record<string, string>
    canPublish: boolean
    status?: string
    reviewRequested?: string | null
    action: string
    /** URL prefix shown before the slug ("/" for pages, "/blog/" for posts) */
    prefix?: string
    kind?: "page" | "post" | "entry"
    /** Extra sidebar fields (blog cover image, entry fields) */
    extra?: Snippet
  } = $props()

  // The editor is re-mounted (via {#key}) when the server returns new values, so capturing props is intentional.
  // svelte-ignore state_referenced_locally
  let title = $state(values.title)
  // svelte-ignore state_referenced_locally
  let slug = $state(values.slug)
  // svelte-ignore state_referenced_locally
  let slugTouched = $state(!!values.slug)
  // svelte-ignore state_referenced_locally
  let blocks: Block[] = $state(structuredClone(initialBlocks))
  // svelte-ignore state_referenced_locally
  let ogImage = $state(values.og_image_url ?? "")
  let tab: "write" | "preview" = $state("write")
  let previewHtml = $state("")
  let previewing = $state(false)
  let dirty = $state(false)
  const blocksJson = $derived(JSON.stringify(blocks))
  const problems = $derived(publishProblems(blocks))

  // svelte-ignore state_referenced_locally
  const initialJson = JSON.stringify(initialBlocks)
  $effect(() => {
    if (blocksJson !== initialJson) dirty = true
  })

  const autoSlug = (t: string) =>
    t
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 100)

  $effect(() => {
    if (!slugTouched) slug = autoSlug(title)
  })

  // Rendered by the server with the same code used on save, so what you see is what gets published.
  async function showPreview() {
    tab = "preview"
    previewing = true
    try {
      const fd = new FormData()
      fd.set("blocks", blocksJson)
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
  <input type="hidden" name="blocks" value={blocksJson} />
  <div class="space-y-4 min-w-0">
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

    <div class="card bg-base-200/40 border border-base-300">
      <div role="tablist" class="tabs tabs-border px-2">
        <button
          type="button"
          role="tab"
          class="tab {tab === 'write' ? 'tab-active' : ''}"
          aria-selected={tab === "write"}
          onclick={() => (tab = "write")}>Content</button
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
        <BlockEditor bind:blocks error={errors.blocks} />
      </div>
      {#if tab === "preview"}
        <div class="p-6 min-h-[50vh] bg-base-100">
          {#if previewing}<span class="loading loading-dots"></span>{:else}
            <article class="prose max-w-none prose-a:text-primary">
              <!-- Sanitised on the server by $lib/server/cms/blocks -->
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
              : reviewRequested
                ? 'badge-warning'
                : 'badge-ghost'}"
            >{reviewRequested && status !== "published"
              ? "in review"
              : status}</span
          >
        </div>
        {#if reviewRequested && values.review_note}
          <p class="text-xs rounded bg-warning/10 p-2">
            Note for the editor: {values.review_note}
          </p>
        {/if}
        {#if canPublish}
          <button
            name="intent"
            value="publish"
            class="btn btn-primary btn-sm w-full"
            disabled={problems.length > 0}
            title={problems.join(". ")}
            >{status === "published" ? "Update live" : "Publish"}</button
          >
          {#if problems.length}<p class="text-xs text-warning">
              {problems[0]}
            </p>{/if}
          <button name="intent" value="draft" class="btn btn-sm w-full"
            >{status === "published"
              ? "Save & unpublish"
              : "Save draft"}</button
          >
        {:else}
          <button name="intent" value="draft" class="btn btn-sm w-full"
            >Save draft</button
          >
          <textarea
            name="review_note"
            class="textarea textarea-sm w-full h-16"
            maxlength="1000"
            placeholder="Note for the editor (optional)"
            >{values.review_note ?? ""}</textarea
          >
          <button
            name="intent"
            value="review"
            class="btn btn-primary btn-sm w-full">Send for review</button
          >
          <p class="text-xs opacity-60">
            An editor checks it and publishes it.
          </p>
        {/if}
        {#if errors._}<p class="text-error text-sm" role="alert">
            {errors._}
          </p>{/if}
      </div>
    </div>

    <div class="card bg-base-100 border border-base-300">
      <div class="card-body gap-3">
        <label class="block">
          <span class="label text-sm whitespace-normal mb-1">URL</span>
          <div class="join w-full">
            <span
              class="join-item btn btn-sm btn-disabled no-animation max-w-[50%] truncate"
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
        {#if kind === "page"}
          <label class="block">
            <span class="label text-sm whitespace-normal mb-1">Layout</span>
            <select
              name="template"
              class="select select-sm w-full"
              value={values.template ?? "default"}
            >
              <option value="default"
                >Standard: title header and a reading column</option
              >
              <option value="wide"
                >Wide: title header and full-width content</option
              >
              <option value="landing"
                >Landing: no title header, full width</option
              >
            </select>
          </label>
        {/if}
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
          open={!!(errors.og_image_url || errors.seo_title)}
        >
          <summary class="collapse-title text-sm font-medium min-h-0 py-2"
            >SEO and sharing</summary
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
            <ImageField label="Image when shared" bind:value={ogImage} />
            <input type="hidden" name="og_image_url" value={ogImage} />
            {#if errors.og_image_url}<span class="text-error text-sm"
                >{errors.og_image_url}</span
              >{/if}
            <label class="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                name="seo_noindex"
                class="checkbox checkbox-xs"
                checked={!!Number(values.seo_noindex ?? 0) ||
                  values.seo_noindex === true}
              />
              Hide from search engines
            </label>
          </div>
        </details>
      </div>
    </div>
  </aside>
</form>
