<script lang="ts">
  // Edits a list of blocks. The parent keeps the list and posts it as JSON; the server validates it.
  import {
    BLOCK_TYPES,
    emptyBlock,
    type Block,
    type BlockType,
  } from "$lib/blocks"
  import ImageField from "./ImageField.svelte"

  let {
    blocks = $bindable(),
    error = "",
    allowed,
  }: {
    blocks: Block[]
    error?: string
    /** Block types offered; all when omitted (reusable blocks leave out "reusable") */
    allowed?: BlockType[]
  } = $props()

  const types = $derived(
    allowed ? BLOCK_TYPES.filter((t) => allowed.includes(t.type)) : BLOCK_TYPES,
  )
  const label = (t: BlockType) =>
    BLOCK_TYPES.find((x) => x.type === t)?.label ?? t
  let adding: number | null = $state(null)

  type Reusable = { id: string; name: string }
  type AppDef = {
    id: string
    name: string
    blocks: {
      name: string
      label: string
      props: { key: string; label: string }[]
    }[]
  }
  let reusables: Reusable[] | null = $state(null)
  let apps: AppDef[] | null = $state(null)

  $effect(() => {
    if (reusables === null && blocks.some((b) => b.type === "reusable"))
      void loadReusables()
    if (apps === null && blocks.some((b) => b.type === "app")) void loadApps()
  })
  async function loadReusables() {
    reusables = []
    const res = await fetch("/admin/blocks/list")
    reusables = res.ok ? (await res.json()).blocks : []
  }
  async function loadApps() {
    apps = []
    const res = await fetch("/admin/apps/blocks")
    apps = res.ok ? (await res.json()).apps : []
  }

  function insert(at: number, type: BlockType) {
    const next = [...blocks]
    next.splice(at, 0, emptyBlock(type))
    blocks = next
    adding = null
  }
  function move(i: number, by: number) {
    const j = i + by
    if (j < 0 || j >= blocks.length) return
    const next = [...blocks]
    ;[next[i], next[j]] = [next[j], next[i]]
    blocks = next
  }
  function remove(i: number) {
    blocks = blocks.filter((_, k) => k !== i)
  }
  function duplicate(i: number) {
    const next = [...blocks]
    next.splice(i + 1, 0, structuredClone($state.snapshot(blocks[i])) as Block)
    blocks = next
  }
</script>

{#snippet addMenu(at: number)}
  {#if adding === at}
    <div class="rounded-box border border-primary/40 bg-base-100 p-3">
      <div class="mb-2 flex items-center justify-between">
        <span class="text-sm font-medium">Add a block</span>
        <button
          type="button"
          class="btn btn-ghost btn-xs"
          onclick={() => (adding = null)}>Cancel</button
        >
      </div>
      <div class="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {#each types as t (t.type)}
          <button
            type="button"
            class="btn btn-sm h-auto min-h-0 flex-col items-start py-2 text-left font-normal"
            onclick={() => insert(at, t.type)}
          >
            <span class="font-semibold">{t.label}</span>
            <span class="text-xs opacity-60">{t.hint}</span>
          </button>
        {/each}
      </div>
    </div>
  {:else}
    <div class="flex justify-center">
      <button
        type="button"
        class="btn btn-ghost btn-xs opacity-60 hover:opacity-100"
        onclick={() => (adding = at)}>+ Add block</button
      >
    </div>
  {/if}
{/snippet}

<div class="space-y-2" data-testid="block-editor">
  {#if error}<p class="alert alert-error text-sm py-2" role="alert">
      {error}
    </p>{/if}
  {@render addMenu(0)}
  {#each blocks as b, i (i)}
    <div
      class="rounded-box border border-base-300 bg-base-100"
      data-block={b.type}
    >
      <div
        class="flex items-center justify-between gap-2 border-b border-base-200 px-3 py-1.5"
      >
        <span class="text-xs font-semibold uppercase tracking-wide opacity-60"
          >{label(b.type)}</span
        >
        <div class="flex gap-1">
          <button
            type="button"
            class="btn btn-ghost btn-xs"
            aria-label="Move up"
            disabled={i === 0}
            onclick={() => move(i, -1)}>Up</button
          >
          <button
            type="button"
            class="btn btn-ghost btn-xs"
            aria-label="Move down"
            disabled={i === blocks.length - 1}
            onclick={() => move(i, 1)}>Down</button
          >
          <button
            type="button"
            class="btn btn-ghost btn-xs"
            onclick={() => duplicate(i)}>Copy</button
          >
          <button
            type="button"
            class="btn btn-ghost btn-xs text-error"
            onclick={() => remove(i)}>Remove</button
          >
        </div>
      </div>
      <div class="space-y-2 p-3">
        {#if b.type === "heading"}
          <div class="flex gap-2">
            <select
              class="select select-sm w-24"
              bind:value={b.level}
              aria-label="Heading level"
            >
              <option value={2}>H2</option><option value={3}>H3</option><option
                value={4}>H4</option
              >
            </select>
            <input
              class="input input-sm grow font-semibold"
              placeholder="Heading"
              maxlength="300"
              bind:value={b.text}
              aria-label="Heading text"
            />
          </div>
          <input
            class="input input-xs w-full font-mono"
            placeholder="Anchor for links, e.g. pricing (optional)"
            maxlength="60"
            bind:value={b.anchor}
            aria-label="Anchor"
          />
        {:else if b.type === "markdown"}
          <textarea
            class="textarea w-full min-h-40 font-mono text-sm leading-relaxed"
            placeholder="Write here. **bold**, *italic*, [link](/pricing), - lists, ## heading"
            maxlength="100000"
            bind:value={b.md}
            aria-label="Text"
          ></textarea>
        {:else if b.type === "image"}
          <ImageField label="Image" bind:value={b.src} />
          <input
            class="input input-sm w-full"
            placeholder="Alt text: what the image shows"
            maxlength="300"
            bind:value={b.alt}
            disabled={b.decorative}
            aria-label="Alt text"
          />
          <input
            class="input input-sm w-full"
            placeholder="Caption (optional)"
            maxlength="300"
            bind:value={b.caption}
            aria-label="Caption"
          />
          <div class="flex flex-wrap gap-4 text-sm">
            <label class="flex items-center gap-2"
              ><input
                type="checkbox"
                class="checkbox checkbox-xs"
                bind:checked={b.decorative}
              /> Decorative, no alt text needed</label
            >
            <label class="flex items-center gap-2"
              ><input
                type="checkbox"
                class="checkbox checkbox-xs"
                bind:checked={b.wide}
              /> Full width</label
            >
          </div>
        {:else if b.type === "gallery"}
          <label class="flex items-center gap-2 text-sm"
            >Columns
            <select class="select select-xs w-20" bind:value={b.columns}>
              <option value={2}>2</option><option value={3}>3</option><option
                value={4}>4</option
              >
            </select>
          </label>
          {#each b.images as img, j (j)}
            <div class="rounded-box border border-base-200 p-2 space-y-1">
              <ImageField label="Image {j + 1}" bind:value={img.src} />
              <div class="flex gap-2">
                <input
                  class="input input-xs grow"
                  placeholder="Alt text"
                  maxlength="300"
                  bind:value={img.alt}
                  aria-label="Alt text for image {j + 1}"
                />
                <button
                  type="button"
                  class="btn btn-ghost btn-xs text-error"
                  onclick={() =>
                    (b.images = b.images.filter((_, k) => k !== j))}
                  >Remove</button
                >
              </div>
            </div>
          {/each}
          <button
            type="button"
            class="btn btn-xs"
            onclick={() =>
              (b.images = [
                ...b.images,
                { src: "", alt: "", caption: "", decorative: false },
              ])}>+ Image</button
          >
        {:else if b.type === "quote"}
          <textarea
            class="textarea textarea-sm w-full"
            placeholder="Quote"
            maxlength="2000"
            bind:value={b.text}
            aria-label="Quote"
          ></textarea>
          <input
            class="input input-sm w-full"
            placeholder="Who said it"
            maxlength="200"
            bind:value={b.cite}
            aria-label="Who said it"
          />
        {:else if b.type === "button"}
          <div class="grid gap-2 sm:grid-cols-[1fr_1fr_8rem]">
            <input
              class="input input-sm"
              placeholder="Button text"
              maxlength="80"
              bind:value={b.label}
              aria-label="Button text"
            />
            <input
              class="input input-sm font-mono"
              placeholder="/contact_us or https://..."
              maxlength="1000"
              bind:value={b.href}
              aria-label="Button link"
            />
            <select
              class="select select-sm"
              bind:value={b.style}
              aria-label="Button style"
            >
              <option value="primary">Filled</option><option value="outline"
                >Outline</option
              >
            </select>
          </div>
        {:else if b.type === "columns"}
          <div
            class="grid gap-2 {b.columns.length === 3
              ? 'md:grid-cols-3'
              : 'md:grid-cols-2'}"
          >
            {#each b.columns as col, j (j)}
              <textarea
                class="textarea textarea-sm w-full min-h-28 font-mono"
                placeholder="Column {j + 1}"
                maxlength="20000"
                bind:value={col.md}
                aria-label="Column {j + 1}"
              ></textarea>
            {/each}
          </div>
          <div class="flex gap-2">
            {#if b.columns.length < 3}<button
                type="button"
                class="btn btn-xs"
                onclick={() => (b.columns = [...b.columns, { md: "" }])}
                >+ Column</button
              >{/if}
            {#if b.columns.length > 2}<button
                type="button"
                class="btn btn-xs"
                onclick={() => (b.columns = b.columns.slice(0, -1))}
                >- Column</button
              >{/if}
          </div>
        {:else if b.type === "embed"}
          <input
            class="input input-sm w-full font-mono"
            placeholder="https://www.youtube.com/watch?v=... or https://vimeo.com/..."
            maxlength="500"
            bind:value={b.url}
            aria-label="Video link"
          />
          <input
            class="input input-sm w-full"
            placeholder="Title for screen readers"
            maxlength="200"
            bind:value={b.title}
            aria-label="Video title"
          />
        {:else if b.type === "divider"}
          <hr class="border-base-300" />
        {:else if b.type === "faq"}
          {#each b.items as item, j (j)}
            <div class="rounded-box border border-base-200 p-2 space-y-1">
              <div class="flex gap-2">
                <input
                  class="input input-sm grow"
                  placeholder="Question"
                  maxlength="300"
                  bind:value={item.q}
                  aria-label="Question {j + 1}"
                />
                <button
                  type="button"
                  class="btn btn-ghost btn-xs text-error"
                  onclick={() => (b.items = b.items.filter((_, k) => k !== j))}
                  >Remove</button
                >
              </div>
              <textarea
                class="textarea textarea-sm w-full"
                placeholder="Answer (Markdown)"
                maxlength="5000"
                bind:value={item.a}
                aria-label="Answer {j + 1}"
              ></textarea>
            </div>
          {/each}
          <button
            type="button"
            class="btn btn-xs"
            onclick={() => (b.items = [...b.items, { q: "", a: "" }])}
            >+ Question</button
          >
        {:else if b.type === "cta"}
          <input
            class="input input-sm w-full font-semibold"
            placeholder="Title"
            maxlength="200"
            bind:value={b.title}
            aria-label="Title"
          />
          <textarea
            class="textarea textarea-sm w-full"
            placeholder="Text"
            maxlength="1000"
            bind:value={b.text}
            aria-label="Text"
          ></textarea>
          <div class="grid gap-2 sm:grid-cols-2">
            <input
              class="input input-sm"
              placeholder="Button text"
              maxlength="80"
              bind:value={b.label}
              aria-label="Button text"
            />
            <input
              class="input input-sm font-mono"
              placeholder="/book"
              maxlength="1000"
              bind:value={b.href}
              aria-label="Button link"
            />
          </div>
        {:else if b.type === "html"}
          <textarea
            class="textarea w-full min-h-32 font-mono text-xs"
            maxlength="200000"
            bind:value={b.html}
            aria-label="HTML"
          ></textarea>
          <p class="text-xs opacity-60">
            Scripts, styles, forms and unknown iframes are removed when you
            save.
          </p>
        {:else if b.type === "form"}
          <input
            class="input input-sm w-full font-mono"
            placeholder="Form address, e.g. job-application"
            maxlength="80"
            bind:value={b.slug}
            aria-label="Form address"
          />
          <input
            class="input input-sm w-full font-semibold"
            placeholder="Title"
            maxlength="200"
            bind:value={b.title}
            aria-label="Title"
          />
          <textarea
            class="textarea textarea-sm w-full"
            placeholder="Text"
            maxlength="500"
            bind:value={b.text}
            aria-label="Text"
          ></textarea>
          <input
            class="input input-sm w-full"
            placeholder="Button text (Open the form)"
            maxlength="60"
            bind:value={b.label}
            aria-label="Button text"
          />
          <p class="text-xs opacity-60">
            Forms are made in <a
              class="link"
              href="/admin/forms"
              target="_blank">Forms</a
            >.
          </p>
        {:else if b.type === "reusable"}
          {#if reusables === null || !reusables.length}
            <p class="text-sm opacity-70">
              {reusables === null ? "Loading..." : "No reusable blocks yet."}
              <a class="link" href="/admin/blocks" target="_blank"
                >Manage reusable blocks</a
              >
            </p>
          {/if}
          {#if reusables?.length}
            <select
              class="select select-sm w-full"
              bind:value={b.ref}
              aria-label="Reusable block"
            >
              <option value="">Choose a block</option>
              {#each reusables as r (r.id)}<option value={r.id}>{r.name}</option
                >{/each}
            </select>
          {/if}
        {:else if b.type === "app"}
          {#if apps === null}<p class="text-sm opacity-70">Loading apps...</p>
          {:else if !apps.length}<p class="text-sm opacity-70">
              No connected app offers blocks. <a
                class="link"
                href="/admin/apps"
                target="_blank">Apps</a
              >
            </p>
          {:else}
            {@const app = apps.find((a) => a.id === b.app)}
            {@const def = app?.blocks.find((d) => d.name === b.block)}
            <div class="grid gap-2 sm:grid-cols-2">
              <select
                class="select select-sm"
                bind:value={b.app}
                aria-label="App"
                onchange={() => (b.block = "")}
              >
                <option value="">Choose an app</option>
                {#each apps as a (a.id)}<option value={a.id}>{a.name}</option
                  >{/each}
              </select>
              <select
                class="select select-sm"
                bind:value={b.block}
                aria-label="App block"
                disabled={!app}
              >
                <option value="">Choose a block</option>
                {#each app?.blocks ?? [] as d (d.name)}<option value={d.name}
                    >{d.label}</option
                  >{/each}
              </select>
            </div>
            {#each def?.props ?? [] as p (p.key)}
              <label class="block text-sm"
                >{p.label}
                <input
                  class="input input-sm w-full"
                  maxlength="2000"
                  value={b.props[p.key] ?? ""}
                  oninput={(e) =>
                    (b.props = { ...b.props, [p.key]: e.currentTarget.value })}
                />
              </label>
            {/each}
          {/if}
        {/if}
      </div>
    </div>
    {@render addMenu(i + 1)}
  {/each}
</div>
