<script lang="ts">
  // Edits a list of blocks. The parent keeps the list and posts it as JSON; the server validates it.
  import { getContext, setContext } from "svelte"
  import {
    BLOCK_TYPES,
    emptyBlock,
    type Block,
    type BlockType,
  } from "$lib/blocks"
  import ImageField from "./ImageField.svelte"
  import { ActiveEditor, EDITOR_CTX } from "./editor/active.svelte"
  import { autosize } from "./editor/autosize"
  import { BLOCK_ICONS, TOOL_ICONS } from "./editor/icons"
  import BlockPicker from "./editor/BlockPicker.svelte"
  import FormatToolbar from "./editor/FormatToolbar.svelte"
  import Icon from "./editor/Icon.svelte"
  import RichText from "./editor/RichText.svelte"

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

  const ctx =
    getContext<ActiveEditor | undefined>(EDITOR_CTX) ??
    setContext(EDITOR_CTX, new ActiveEditor())

  const types = $derived(
    allowed ? BLOCK_TYPES.filter((t) => allowed.includes(t.type)) : BLOCK_TYPES,
  )
  const label = (t: BlockType) =>
    BLOCK_TYPES.find((x) => x.type === t)?.label ?? t
  let adding: number | null = $state(null)
  // Stable keys, so moving a block keeps its editor and focus.
  let keys: number[] = $state([])
  let nextKey = 0
  $effect.pre(() => {
    while (keys.length < blocks.length) keys.push(nextKey++)
    if (keys.length > blocks.length) keys.length = blocks.length
  })

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

  let root: HTMLDivElement | undefined = $state()
  function focusBlock(i: number, tries = 10) {
    requestAnimationFrame(() => {
      const block = root?.querySelector(`[data-index="${i}"]`)
      const el = ["[contenteditable]", "textarea", "input:not([type=hidden])"]
        .flatMap((q) => [...(block?.querySelectorAll<HTMLElement>(q) ?? [])])
        .find((x) => !x.closest("[data-controls]"))
      // A text block's editor loads a moment later, so try again briefly.
      if (el) el.focus()
      else if (tries) setTimeout(() => focusBlock(i, tries - 1), 50)
    })
  }
  function insert(at: number, type: BlockType) {
    const next = [...blocks]
    next.splice(at, 0, emptyBlock(type))
    keys.splice(at, 0, nextKey++)
    blocks = next
    adding = null
    focusBlock(at)
  }
  function move(i: number, by: number) {
    const j = i + by
    if (j < 0 || j >= blocks.length) return
    const next = [...blocks]
    ;[next[i], next[j]] = [next[j], next[i]]
    ;[keys[i], keys[j]] = [keys[j], keys[i]]
    blocks = next
  }
  function remove(i: number) {
    keys.splice(i, 1)
    blocks = blocks.filter((_, k) => k !== i)
  }
  function duplicate(i: number) {
    const next = [...blocks]
    next.splice(i + 1, 0, structuredClone($state.snapshot(blocks[i])) as Block)
    keys.splice(i + 1, 0, nextKey++)
    blocks = next
  }
  // Focus outside a text block leaves the formatting bar with nothing to act on.
  function focusIn(e: FocusEvent) {
    const t = e.target as HTMLElement
    if (!t.closest("[data-rich], [data-format-toolbar]")) ctx.api = null
  }
</script>

{#snippet inserter(at: number, last = false)}
  <div class="relative {last ? 'pt-2' : ''}">
    {#if last}
      <button
        type="button"
        class="flex w-full items-center justify-center gap-2 rounded-box border border-dashed border-base-300 py-3 text-sm opacity-70 hover:border-primary hover:text-primary hover:opacity-100"
        onclick={() => (adding = adding === at ? null : at)}
        ><Icon d={TOOL_ICONS.plus} /> Add block
        <span class="hidden opacity-60 sm:inline"
          >or type / in a text block</span
        ></button
      >
    {:else}
      <div class="group/ins flex h-5 items-center">
        <span
          class="h-px grow bg-primary/50 opacity-0 transition group-hover/ins:opacity-100 {adding ===
          at
            ? 'opacity-100'
            : ''}"
        ></span>
        <button
          type="button"
          class="btn btn-circle btn-xs mx-2 border-base-300 opacity-0 transition focus:opacity-100 group-hover/ins:opacity-100 {adding ===
          at
            ? 'btn-primary opacity-100'
            : ''}"
          aria-label="Add a block here"
          title="Add a block here"
          onclick={() => (adding = adding === at ? null : at)}
          ><Icon d={TOOL_ICONS.plus} class="size-3" /></button
        >
        <span
          class="h-px grow bg-primary/50 opacity-0 transition group-hover/ins:opacity-100 {adding ===
          at
            ? 'opacity-100'
            : ''}"
        ></span>
      </div>
    {/if}
    {#if adding === at}
      <BlockPicker
        {types}
        onpick={(t) => insert(at, t)}
        onclose={() => (adding = null)}
      />
    {/if}
  </div>
{/snippet}

{#snippet controls(b: Block, i: number)}
  <div
    data-controls
    class="absolute -top-3.5 right-2 z-10 flex items-center gap-0.5 rounded-full border border-base-300 bg-base-100 px-1.5 py-0.5 opacity-0 shadow-sm transition group-focus-within/block:opacity-100 group-hover/block:opacity-100"
  >
    <span
      class="flex items-center gap-1 px-1 text-[11px] font-semibold uppercase tracking-wide opacity-60"
      ><Icon d={BLOCK_ICONS[b.type]} class="size-3" />{label(b.type)}</span
    >
    {#if b.type === "heading"}
      <select
        class="select select-ghost select-xs w-16"
        bind:value={b.level}
        aria-label="Heading level"
      >
        <option value={2}>H2</option><option value={3}>H3</option><option
          value={4}>H4</option
        >
      </select>
    {/if}
    <button
      type="button"
      class="btn btn-ghost btn-xs btn-circle"
      aria-label="Move up"
      title="Move up"
      disabled={i === 0}
      onclick={() => move(i, -1)}
      ><Icon d={TOOL_ICONS.up} class="size-3.5" /></button
    >
    <button
      type="button"
      class="btn btn-ghost btn-xs btn-circle"
      aria-label="Move down"
      title="Move down"
      disabled={i === blocks.length - 1}
      onclick={() => move(i, 1)}
      ><Icon d={TOOL_ICONS.down} class="size-3.5" /></button
    >
    <button
      type="button"
      class="btn btn-ghost btn-xs btn-circle"
      aria-label="Duplicate"
      title="Duplicate"
      onclick={() => duplicate(i)}
      ><Icon d={TOOL_ICONS.copy} class="size-3.5" /></button
    >
    <button
      type="button"
      class="btn btn-ghost btn-xs btn-circle text-error"
      aria-label="Remove"
      title="Remove"
      onclick={() => remove(i)}
      ><Icon d={TOOL_ICONS.trash} class="size-3.5" /></button
    >
  </div>
{/snippet}

<div
  class="space-y-1"
  data-testid="block-editor"
  bind:this={root}
  onfocusin={focusIn}
>
  <div class="sticky z-30 pb-3" style="top: var(--editor-top, 0px)">
    <FormatToolbar {ctx} />
  </div>
  {#if error}<p class="alert alert-error text-sm py-2" role="alert">
      {error}
    </p>{/if}
  {#if blocks.length}{@render inserter(0)}{/if}
  {#each blocks as b, i (keys[i] ?? i)}
    <div
      class="group/block relative rounded-box border border-transparent px-1 py-2 transition hover:border-base-300 focus-within:border-base-300 sm:px-3"
      data-block={b.type}
      data-index={i}
    >
      {@render controls(b, i)}
      {#if b.type === "markdown"}
        <RichText bind:value={b.md} oninsertblock={(t) => insert(i + 1, t)} />
      {:else if b.type === "heading"}
        <input
          class="w-full bg-transparent font-bold leading-tight focus:outline-none {b.level ===
          2
            ? 'text-3xl'
            : b.level === 3
              ? 'text-2xl'
              : 'text-xl'}"
          placeholder="Heading"
          maxlength="300"
          bind:value={b.text}
          aria-label="Heading text"
        />
        <div class="hidden pt-1 group-focus-within/block:block">
          <input
            class="input input-ghost input-xs w-full font-mono opacity-70"
            placeholder="Anchor for links, e.g. pricing (optional)"
            maxlength="60"
            bind:value={b.anchor}
            aria-label="Anchor"
          />
        </div>
      {:else if b.type === "quote"}
        <blockquote class="border-l-4 border-primary/60 pl-4">
          <textarea
            class="block w-full resize-none bg-transparent text-xl italic leading-relaxed focus:outline-none"
            placeholder="Quote"
            maxlength="2000"
            rows="1"
            use:autosize
            bind:value={b.text}
            aria-label="Quote"
          ></textarea>
          <input
            class="mt-1 w-full bg-transparent text-sm opacity-70 focus:outline-none"
            placeholder="Who said it"
            maxlength="200"
            bind:value={b.cite}
            aria-label="Who said it"
          />
        </blockquote>
      {:else if b.type === "divider"}
        <hr class="my-3 border-base-300" />
      {:else if b.type === "image"}
        {#if b.src}
          <figure class="space-y-2">
            <img
              src={b.src}
              alt={b.alt}
              class="mx-auto max-h-[28rem] rounded-box object-contain"
            />
            <input
              class="w-full bg-transparent text-center text-sm opacity-70 focus:outline-none"
              placeholder="Add a caption (optional)"
              maxlength="300"
              bind:value={b.caption}
              aria-label="Caption"
            />
          </figure>
          <div
            class="hidden space-y-2 pt-2 group-focus-within/block:block group-hover/block:block"
          >
            <input
              class="input input-sm w-full"
              placeholder="Alt text: what the image shows"
              maxlength="300"
              bind:value={b.alt}
              disabled={b.decorative}
              aria-label="Alt text"
            />
            <div class="flex flex-wrap items-center gap-4 text-sm">
              <label class="flex items-center gap-2"
                ><input
                  type="checkbox"
                  class="checkbox checkbox-xs"
                  bind:checked={b.decorative}
                /> Decorative</label
              >
              <label class="flex items-center gap-2"
                ><input
                  type="checkbox"
                  class="checkbox checkbox-xs"
                  bind:checked={b.wide}
                /> Full width</label
              >
              <button
                type="button"
                class="btn btn-ghost btn-xs ml-auto"
                onclick={() => (b.src = "")}>Replace image</button
              >
            </div>
          </div>
        {:else}
          <div
            class="rounded-box border border-dashed border-base-300 p-4 space-y-2"
          >
            <ImageField label="Image" bind:value={b.src} />
            <input
              class="input input-sm w-full"
              placeholder="Alt text: what the image shows"
              maxlength="300"
              bind:value={b.alt}
              disabled={b.decorative}
              aria-label="Alt text"
            />
          </div>
        {/if}
      {:else if b.type === "columns"}
        <div
          class="grid gap-4 {b.columns.length === 3
            ? 'md:grid-cols-3'
            : 'md:grid-cols-2'}"
        >
          {#each b.columns as col, j (j)}
            <div class="rounded-box border border-base-300 p-3">
              <RichText
                bind:value={col.md}
                label="Column {j + 1}"
                placeholder="Column {j + 1}"
                compact
              />
            </div>
          {/each}
        </div>
        <div class="mt-2 flex gap-2">
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
      {:else}
        <div class="space-y-2 rounded-box bg-base-200/50 p-4">
          <div class="flex items-center gap-2 text-sm font-semibold opacity-70">
            <Icon d={BLOCK_ICONS[b.type]} />{label(b.type)}
          </div>
          {#if b.type === "gallery"}
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
                    onclick={() =>
                      (b.items = b.items.filter((_, k) => k !== j))}
                    >Remove</button
                  >
                </div>
                <RichText
                  bind:value={item.a}
                  label="Answer {j + 1}"
                  placeholder="Answer"
                  compact
                />
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
                {#each reusables as r (r.id)}<option value={r.id}
                    >{r.name}</option
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
                      (b.props = {
                        ...b.props,
                        [p.key]: e.currentTarget.value,
                      })}
                  />
                </label>
              {/each}
            {/if}
          {/if}
        </div>
      {/if}
    </div>
    {#if i < blocks.length - 1}{@render inserter(i + 1)}{/if}
  {/each}
  {@render inserter(blocks.length, true)}
</div>
