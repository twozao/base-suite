<script lang="ts">
  import { enhance } from "$app/forms"
  import type { Snippet } from "svelte"
  import { blocksToText, publishProblems, type Block } from "$lib/blocks"
  import { formatDateTime } from "$lib/format"
  import BlockEditor from "./BlockEditor.svelte"
  import ImageField from "./ImageField.svelte"
  import { autosize } from "./editor/autosize"

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
    panels,
    back = "",
    liveHref = "",
    updatedAt = null,
    notice = null,
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
    /** Sidebar sections with their own forms (revisions, delete), outside the editor form */
    panels?: Snippet
    /** Where Back goes */
    back?: string
    /** The live address, shown once published */
    liveHref?: string
    updatedAt?: string | null
    /** Result of the last save, shown above the document */
    notice?: { message?: string; error?: string } | null
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
  const words = $derived(
    blocksToText(blocks).split(/\s+/).filter(Boolean).length,
  )
  // svelte-ignore state_referenced_locally
  let excerpt = $state(values.excerpt ?? "")
  // svelte-ignore state_referenced_locally
  let seoTitle = $state(values.seo_title ?? "")
  // svelte-ignore state_referenced_locally
  let seoDescription = $state(values.seo_description ?? "")
  let form: HTMLFormElement | undefined = $state()
  let titleEl: HTMLTextAreaElement | undefined = $state()
  const noun = $derived(
    kind === "post" ? "post" : kind === "page" ? "page" : "entry",
  )
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

  // Cmd+S saves and keeps the current status: a live page is updated, a draft stays a draft.
  function keydown(e: KeyboardEvent) {
    if (!(e.metaKey || e.ctrlKey) || e.key.toLowerCase() !== "s") return
    e.preventDefault()
    const intent =
      canPublish && status === "published" && !problems.length
        ? "publish"
        : "draft"
    const btn = form?.querySelector<HTMLButtonElement>(
      `button[name="intent"][value="${intent}"]`,
    )
    if (btn) form?.requestSubmit(btn)
  }
</script>

<svelte:window onbeforeunload={beforeUnload} onkeydown={keydown} />
<svelte:head><title>{title || `New ${noun}`} - Admin</title></svelte:head>

<div
  class="grid gap-x-8 gap-y-6 lg:grid-cols-[minmax(0,1fr)_20rem] lg:grid-rows-[auto_auto_1fr] lg:items-start [--editor-top:7rem] sm:[--editor-top:4.5rem]"
>
  <form
    bind:this={form}
    method="POST"
    {action}
    class="contents"
    oninput={() => (dirty = true)}
    use:enhance={() => {
      return async ({ update }) => {
        dirty = false
        await update({ reset: false })
      }
    }}
  >
    <input type="hidden" name="blocks" value={blocksJson} />

    <header
      class="sticky top-0 z-40 col-span-full -mx-4 -mt-4 flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-base-300 bg-base-200/90 px-4 py-3 backdrop-blur lg:-mx-8 lg:-mt-8 lg:px-8"
    >
      {#if back}<a
          href={back}
          class="btn btn-ghost btn-sm btn-square"
          aria-label="Back"
          title="Back"
          ><svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            class="size-5"
            aria-hidden="true"
            ><path
              d="M15 18l-6-6 6-6"
              stroke-linecap="round"
              stroke-linejoin="round"
            /></svg
          ></a
        >{/if}
      <div class="min-w-0 grow basis-40">
        <div class="flex items-center gap-2">
          <span class="truncate font-semibold">{title || `New ${noun}`}</span>
          <span
            class="badge badge-sm {status === 'published'
              ? 'badge-success'
              : reviewRequested
                ? 'badge-warning'
                : 'badge-ghost'}"
            >{reviewRequested && status !== "published"
              ? "in review"
              : status}</span
          >
        </div>
        <p class="text-xs opacity-60" aria-live="polite">
          {#if dirty}<span class="text-warning">Unsaved changes</span
            >{:else if updatedAt}Saved {formatDateTime(updatedAt)}{:else}Not
            saved yet{/if}
          <span class="hidden sm:inline">
            - {words} words, {Math.max(1, Math.round(words / 220))} min read</span
          >
        </p>
      </div>
      <div class="join">
        <button
          type="button"
          class="btn btn-sm join-item {tab === 'write' ? 'btn-active' : ''}"
          aria-pressed={tab === "write"}
          onclick={() => (tab = "write")}>Write</button
        >
        <button
          type="button"
          class="btn btn-sm join-item {tab === 'preview' ? 'btn-active' : ''}"
          aria-pressed={tab === "preview"}
          onclick={showPreview}>Preview</button
        >
      </div>
      {#if liveHref && status === "published"}<a
          class="btn btn-ghost btn-sm"
          href={liveHref}
          target="_blank">View live</a
        >{/if}
      {#if canPublish}
        <button name="intent" value="draft" class="btn btn-sm"
          >{status === "published" ? "Unpublish" : "Save draft"}</button
        >
        <button
          name="intent"
          value="publish"
          class="btn btn-primary btn-sm"
          disabled={problems.length > 0}
          title={problems.length ? problems.join(". ") : "Cmd+S saves too"}
          >{status === "published" ? "Update live" : "Publish"}</button
        >
      {:else}
        <button name="intent" value="draft" class="btn btn-sm"
          >Save draft</button
        >
        <button name="intent" value="review" class="btn btn-primary btn-sm"
          >Send for review</button
        >
      {/if}
    </header>

    <div class="min-w-0 lg:row-span-2">
      {#if notice?.error}<p class="alert alert-error mb-4 text-sm" role="alert">
          {notice.error}
        </p>{:else if notice?.message && !dirty}<p
          class="alert alert-success mb-4 text-sm"
          role="status"
        >
          {notice.message}
        </p>{/if}
      {#if errors._}<p class="alert alert-error mb-4 text-sm" role="alert">
          {errors._}
        </p>{/if}
      {#if canPublish && problems.length}<p
          class="alert alert-warning mb-4 text-sm"
        >
          {problems[0]}
        </p>{/if}
      <div
        class="mx-auto max-w-3xl rounded-box border border-base-300 bg-base-100 px-4 py-8 shadow-sm sm:px-10"
        class:hidden={tab !== "write"}
      >
        <textarea
          bind:this={titleEl}
          name="title"
          class="block w-full resize-none bg-transparent text-3xl font-bold leading-tight placeholder:opacity-40 focus:outline-none sm:text-4xl {errors.title
            ? 'text-error'
            : ''}"
          placeholder="Title"
          aria-label="Title"
          rows="1"
          maxlength="200"
          required
          use:autosize
          bind:value={title}
          onkeydown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault()
              form
                ?.querySelector<HTMLElement>(
                  "[contenteditable], [data-index] input, [data-index] textarea",
                )
                ?.focus()
            }
          }}
        ></textarea>
        {#if errors.title}<span class="text-error text-sm">{errors.title}</span
          >{/if}
        <p class="mt-1 mb-6 truncate font-mono text-xs opacity-50">
          {prefix}{slug || "..."}
        </p>
        <BlockEditor bind:blocks error={errors.blocks} />
      </div>
      {#if tab === "preview"}
        <div
          class="mx-auto max-w-3xl rounded-box border border-base-300 bg-base-100 px-4 py-8 shadow-sm sm:px-10 min-h-[50vh]"
        >
          {#if previewing}<span class="loading loading-dots"></span>{:else}
            <h1 class="mb-6 text-4xl font-bold">{title}</h1>
            <article class="prose max-w-none prose-a:text-primary">
              <!-- Sanitised on the server by $lib/server/cms/blocks -->
              <!-- eslint-disable-next-line svelte/no-at-html-tags -->
              {@html previewHtml}
            </article>
          {/if}
        </div>
      {/if}
    </div>

    <aside class="space-y-4 lg:col-start-2">
      {#if reviewRequested && values.review_note}
        <p class="rounded-box bg-warning/10 p-3 text-sm">
          Note for the editor: {values.review_note}
        </p>
      {/if}
      {#if !canPublish}
        <div class="rounded-box border border-base-300 bg-base-100 p-4">
          <label class="block text-sm">
            <span class="mb-1 block font-medium">Note for the editor</span>
            <textarea
              name="review_note"
              class="textarea textarea-sm w-full h-16"
              maxlength="1000"
              placeholder="Optional">{values.review_note ?? ""}</textarea
            >
          </label>
          <p class="mt-1 text-xs opacity-60">
            An editor checks it and publishes it.
          </p>
        </div>
      {/if}

      <section
        class="rounded-box border border-base-300 bg-base-100 p-4 space-y-3"
      >
        <h2 class="text-sm font-semibold uppercase tracking-wide opacity-60">
          {noun === "entry"
            ? "Details"
            : `${noun[0].toUpperCase()}${noun.slice(1)} settings`}
        </h2>
        <label class="block">
          <span class="mb-1 block text-sm">URL</span>
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
            <span class="mb-1 block text-sm">Layout</span>
            <select
              name="template"
              class="select select-sm w-full"
              value={values.template ?? "default"}
            >
              <option value="default">Standard: reading column</option>
              <option value="wide">Wide: full-width content</option>
              <option value="landing">Landing: no title header</option>
            </select>
          </label>
        {/if}
        {@render extra?.()}
        <label class="block">
          <span class="mb-1 flex justify-between text-sm"
            ><span>Excerpt</span><span class="text-xs opacity-50"
              >{excerpt.length}/500</span
            ></span
          >
          <textarea
            name="excerpt"
            class="textarea textarea-sm w-full"
            rows="3"
            maxlength="500"
            placeholder="A sentence or two for lists and search results"
            bind:value={excerpt}
          ></textarea>
        </label>
      </section>

      <details
        class="group rounded-box border border-base-300 bg-base-100"
        open={!!(errors.og_image_url || errors.seo_title)}
      >
        <summary
          class="flex cursor-pointer list-none items-center justify-between p-4 text-sm font-semibold uppercase tracking-wide opacity-80"
          >Search and sharing <span
            class="transition group-open:rotate-180"
            aria-hidden="true">v</span
          ></summary
        >
        <div class="space-y-3 px-4 pb-4">
          <div
            class="rounded-lg border border-base-300 bg-base-200/40 p-3 text-sm"
            aria-label="Search result preview"
          >
            <p class="truncate text-xs opacity-60">{prefix}{slug}</p>
            <p class="truncate text-base text-primary">
              {seoTitle || title || "Title"}
            </p>
            <p class="line-clamp-2 text-xs opacity-70">
              {seoDescription ||
                excerpt ||
                "Add an excerpt or a description to control what search engines show."}
            </p>
          </div>
          <label class="block">
            <span class="mb-1 flex justify-between text-sm"
              ><span>SEO title</span><span
                class="text-xs {seoTitle.length > 60
                  ? 'text-warning'
                  : 'opacity-50'}">{seoTitle.length}/60</span
              ></span
            >
            <input
              name="seo_title"
              class="input input-sm w-full"
              placeholder="Defaults to the title"
              maxlength="200"
              bind:value={seoTitle}
            />
          </label>
          <label class="block">
            <span class="mb-1 flex justify-between text-sm"
              ><span>Description</span><span
                class="text-xs {seoDescription.length > 160
                  ? 'text-warning'
                  : 'opacity-50'}">{seoDescription.length}/160</span
              ></span
            >
            <textarea
              name="seo_description"
              class="textarea textarea-sm w-full"
              rows="3"
              placeholder="Defaults to the excerpt"
              maxlength="500"
              bind:value={seoDescription}
            ></textarea>
          </label>
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
    </aside>
  </form>
  {#if panels}
    <aside class="space-y-4 lg:col-start-2">{@render panels()}</aside>
  {/if}
</div>
