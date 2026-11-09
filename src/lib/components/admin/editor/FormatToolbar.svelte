<script lang="ts">
  // One formatting bar for every text block: it acts on the text block that last had focus.
  import ImageField from "../ImageField.svelte"
  import type { ActiveEditor } from "./active.svelte"
  import { TOOL_ICONS } from "./icons"
  import { safeHref } from "./tiptap"
  import Icon from "./Icon.svelte"

  let { ctx }: { ctx: ActiveEditor } = $props()

  const ed = $derived((ctx.version, ctx.api?.editor ?? null))
  const on = (name: string, attrs?: Record<string, unknown>) => (
    ctx.version, !!ed && ed.isActive(name, attrs)
  )
  const blockStyle = $derived.by(() => {
    void ctx.version
    if (!ed) return "p"
    for (const l of [2, 3, 4])
      if (ed.isActive("heading", { level: l })) return `h${l}`
    if (ed.isActive("codeBlock")) return "code"
    return "p"
  })

  function setBlock(v: string) {
    if (!ed) return
    const c = ed.chain().focus()
    if (v === "p") c.setParagraph().run()
    else if (v === "code") c.toggleCodeBlock().run()
    else c.setHeading({ level: Number(v.slice(1)) as 2 | 3 | 4 }).run()
  }

  const focusNow = (el: HTMLInputElement) => {
    requestAnimationFrame(() => el.focus())
  }
  let linkUrl = $state("")
  let linkError = $state("")
  let imageOpen = $state(false)
  let imageSrc = $state("")
  let imageAlt = $state("")

  $effect(() => {
    if (ctx.linkOpen && ed) {
      linkUrl = (ed.getAttributes("link").href as string) ?? ""
      linkError = ""
    }
  })

  function applyLink() {
    if (!ed) return
    if (!linkUrl.trim()) {
      ed.chain().focus().extendMarkRange("link").unsetLink().run()
      ctx.linkOpen = false
      return
    }
    const href = safeHref(linkUrl)
    if (!href) {
      linkError = "Use a page path like /pricing, or a full https:// address"
      return
    }
    const chain = ed.chain().focus().extendMarkRange("link")
    if (ed.state.selection.empty && !ed.isActive("link"))
      chain.insertContent({
        type: "text",
        text: linkUrl.trim(),
        marks: [{ type: "link", attrs: { href } }],
      })
    else chain.setLink({ href })
    chain.run()
    ctx.linkOpen = false
  }

  function insertImage() {
    if (!ed || !imageSrc) return
    ed.chain().focus().setImage({ src: imageSrc, alt: imageAlt }).run()
    imageOpen = false
    imageSrc = ""
    imageAlt = ""
  }

  const tools: {
    key: string
    label: string
    icon: string
    active?: () => boolean
    run: () => void
  }[] = [
    {
      key: "bold",
      label: "Bold (Cmd+B)",
      icon: TOOL_ICONS.bold,
      active: () => on("bold"),
      run: () => ed?.chain().focus().toggleBold().run(),
    },
    {
      key: "italic",
      label: "Italic (Cmd+I)",
      icon: TOOL_ICONS.italic,
      active: () => on("italic"),
      run: () => ed?.chain().focus().toggleItalic().run(),
    },
    {
      key: "strike",
      label: "Strikethrough",
      icon: TOOL_ICONS.strike,
      active: () => on("strike"),
      run: () => ed?.chain().focus().toggleStrike().run(),
    },
    {
      key: "code",
      label: "Inline code",
      icon: TOOL_ICONS.code,
      active: () => on("code"),
      run: () => ed?.chain().focus().toggleCode().run(),
    },
    {
      key: "link",
      label: "Link (Cmd+K)",
      icon: TOOL_ICONS.link,
      active: () => on("link"),
      run: () => {
        imageOpen = false
        ctx.linkOpen = !ctx.linkOpen
      },
    },
    {
      key: "bullet",
      label: "Bulleted list",
      icon: TOOL_ICONS.bullet,
      active: () => on("bulletList"),
      run: () => ed?.chain().focus().toggleBulletList().run(),
    },
    {
      key: "ordered",
      label: "Numbered list",
      icon: TOOL_ICONS.ordered,
      active: () => on("orderedList"),
      run: () => ed?.chain().focus().toggleOrderedList().run(),
    },
    {
      key: "quote",
      label: "Quote",
      icon: TOOL_ICONS.quote,
      active: () => on("blockquote"),
      run: () => ed?.chain().focus().toggleBlockquote().run(),
    },
    {
      key: "divider",
      label: "Divider line",
      icon: TOOL_ICONS.divider,
      run: () => ed?.chain().focus().setHorizontalRule().run(),
    },
    {
      key: "table",
      label: "Table",
      icon: TOOL_ICONS.table,
      active: () => on("table"),
      run: () =>
        ed
          ?.chain()
          .focus()
          .insertTable({ rows: 3, cols: 3, withHeaderRow: true })
          .run(),
    },
    {
      key: "image",
      label: "Image in the text",
      icon: TOOL_ICONS.image,
      run: () => {
        ctx.linkOpen = false
        imageOpen = !imageOpen
      },
    },
  ]
</script>

<div
  class="relative rounded-box border border-base-300 bg-base-100/95 shadow-sm backdrop-blur"
  data-format-toolbar
>
  <div
    class="flex items-center gap-0.5 overflow-x-auto p-1 sm:flex-wrap sm:overflow-visible"
    role="toolbar"
    aria-label="Text formatting"
  >
    <select
      class="select select-ghost select-sm w-32 shrink-0"
      aria-label="Text style"
      disabled={!ed}
      value={blockStyle}
      onchange={(e) => setBlock(e.currentTarget.value)}
    >
      <option value="p">Paragraph</option>
      <option value="h2">Heading 2</option>
      <option value="h3">Heading 3</option>
      <option value="h4">Heading 4</option>
      <option value="code">Code block</option>
    </select>
    <span class="mx-1 h-5 w-px shrink-0 bg-base-300"></span>
    {#each tools as t (t.key)}
      <button
        type="button"
        class="btn btn-ghost btn-sm btn-square shrink-0 {t.active?.()
          ? 'bg-base-300 text-primary'
          : ''}"
        title={t.label}
        aria-label={t.label}
        aria-pressed={t.active ? t.active() : undefined}
        disabled={!ed}
        onmousedown={(e) => e.preventDefault()}
        onclick={t.run}><Icon d={t.icon} /></button
      >
      {#if t.key === "code" || t.key === "link" || t.key === "divider"}<span
          class="mx-1 h-5 w-px shrink-0 bg-base-300"
        ></span>{/if}
    {/each}
    <span class="grow"></span>
    <button
      type="button"
      class="btn btn-ghost btn-sm btn-square shrink-0"
      title="Undo (Cmd+Z)"
      aria-label="Undo"
      disabled={!ed || !(ctx.version, ed.can().undo())}
      onmousedown={(e) => e.preventDefault()}
      onclick={() => ed?.chain().focus().undo().run()}
      ><Icon d={TOOL_ICONS.undo} /></button
    >
    <button
      type="button"
      class="btn btn-ghost btn-sm btn-square shrink-0"
      title="Redo (Cmd+Shift+Z)"
      aria-label="Redo"
      disabled={!ed || !(ctx.version, ed.can().redo())}
      onmousedown={(e) => e.preventDefault()}
      onclick={() => ed?.chain().focus().redo().run()}
      ><Icon d={TOOL_ICONS.redo} /></button
    >
    <button
      type="button"
      class="btn btn-ghost btn-sm gap-1"
      title="Edit this text block as Markdown"
      disabled={!ed}
      onclick={() => ctx.api?.toggleSource()}
      ><Icon d={TOOL_ICONS.source} /><span class="hidden sm:inline"
        >Markdown</span
      ></button
    >
  </div>
  {#if on("table")}
    <div
      class="flex w-full flex-wrap items-center gap-1 border-t border-base-300 px-1 pt-1 text-xs"
    >
      <span class="opacity-60">Table:</span>
      {#each [["Row above", "addRowBefore"], ["Row below", "addRowAfter"], ["Column left", "addColumnBefore"], ["Column right", "addColumnAfter"], ["Delete row", "deleteRow"], ["Delete column", "deleteColumn"], ["Delete table", "deleteTable"]] as [l, cmd] (cmd)}
        <button
          type="button"
          class="btn btn-ghost btn-xs {cmd.startsWith('delete')
            ? 'text-error'
            : ''}"
          onmousedown={(e) => e.preventDefault()}
          onclick={() => ed?.chain().focus()[cmd as "addRowAfter"]().run()}
          >{l}</button
        >
      {/each}
    </div>
  {/if}

  {#if ctx.linkOpen && ed}
    <div
      class="absolute left-1 top-full z-40 mt-2 w-80 max-w-[calc(100vw-2rem)] rounded-box border border-base-300 bg-base-100 p-3 shadow-xl"
    >
      <label class="text-sm"
        >Link to
        <input
          class="input input-sm w-full font-mono"
          placeholder="/pricing or https://..."
          bind:value={linkUrl}
          use:focusNow
          onkeydown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault()
              applyLink()
            }
            if (e.key === "Escape") ctx.linkOpen = false
          }}
        /></label
      >
      {#if linkError}<p class="mt-1 text-xs text-error">{linkError}</p>{/if}
      <div class="mt-2 flex gap-2">
        <button type="button" class="btn btn-primary btn-xs" onclick={applyLink}
          >Apply</button
        >
        {#if on("link")}<button
            type="button"
            class="btn btn-ghost btn-xs"
            onclick={() => {
              ed?.chain().focus().extendMarkRange("link").unsetLink().run()
              ctx.linkOpen = false
            }}>Remove link</button
          >{/if}
        <button
          type="button"
          class="btn btn-ghost btn-xs ml-auto"
          onclick={() => (ctx.linkOpen = false)}>Cancel</button
        >
      </div>
    </div>
  {/if}
  {#if imageOpen && ed}
    <div
      class="absolute left-1 top-full z-40 mt-2 w-96 max-w-[calc(100vw-2rem)] space-y-2 rounded-box border border-base-300 bg-base-100 p-3 shadow-xl"
    >
      <ImageField label="Image" bind:value={imageSrc} />
      <input
        class="input input-sm w-full"
        placeholder="Alt text: what the image shows"
        maxlength="300"
        bind:value={imageAlt}
      />
      <div class="flex gap-2">
        <button
          type="button"
          class="btn btn-primary btn-xs"
          disabled={!imageSrc}
          onclick={insertImage}>Insert</button
        >
        <button
          type="button"
          class="btn btn-ghost btn-xs ml-auto"
          onclick={() => (imageOpen = false)}>Cancel</button
        >
      </div>
    </div>
  {/if}
</div>
