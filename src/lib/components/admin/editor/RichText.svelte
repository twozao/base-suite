<script lang="ts">
  // Rich text over Markdown: edits look like the published page, and the block still stores Markdown.
  import { getContext, onDestroy } from "svelte"
  import type { Editor } from "@tiptap/core"
  import type { BlockType } from "$lib/blocks"
  import { ActiveEditor, EDITOR_CTX, type RichApi } from "./active.svelte"
  import { autosize } from "./autosize"
  import { loadTiptap, needsSource } from "./tiptap"
  import { BLOCK_ICONS, TOOL_ICONS } from "./icons"
  import Icon from "./Icon.svelte"

  let {
    value = $bindable(""),
    label = "Text",
    placeholder = "Write something, or type / for headings, lists and blocks",
    compact = false,
    oninsertblock,
  }: {
    value: string
    label?: string
    placeholder?: string
    compact?: boolean
    /** Adds a block after this one, from the / menu */
    oninsertblock?: (type: BlockType) => void
  } = $props()

  const ctx = getContext<ActiveEditor | undefined>(EDITOR_CTX)
  let host: HTMLDivElement | undefined = $state()
  let editor: Editor | null = $state.raw(null)
  let source = $state(needsSource(value))
  let lastEmitted = value
  let failed = $state(false)

  type SlashItem = {
    label: string
    hint: string
    icon: string
    run: (e: Editor) => void
  }
  const FORMATS: SlashItem[] = [
    {
      label: "Heading 2",
      hint: "Section title",
      icon: BLOCK_ICONS.heading,
      run: (e) => e.chain().focus().setHeading({ level: 2 }).run(),
    },
    {
      label: "Heading 3",
      hint: "Smaller title",
      icon: BLOCK_ICONS.heading,
      run: (e) => e.chain().focus().setHeading({ level: 3 }).run(),
    },
    {
      label: "Bulleted list",
      hint: "Simple list",
      icon: TOOL_ICONS.bullet,
      run: (e) => e.chain().focus().toggleBulletList().run(),
    },
    {
      label: "Numbered list",
      hint: "Steps in order",
      icon: TOOL_ICONS.ordered,
      run: (e) => e.chain().focus().toggleOrderedList().run(),
    },
    {
      label: "Quote",
      hint: "Quoted text",
      icon: TOOL_ICONS.quote,
      run: (e) => e.chain().focus().toggleBlockquote().run(),
    },
    {
      label: "Code",
      hint: "Code snippet",
      icon: TOOL_ICONS.code,
      run: (e) => e.chain().focus().toggleCodeBlock().run(),
    },
    {
      label: "Divider line",
      hint: "Line inside the text",
      icon: TOOL_ICONS.divider,
      run: (e) => e.chain().focus().setHorizontalRule().run(),
    },
  ]
  const BLOCKS: { type: BlockType; label: string }[] = [
    { type: "image", label: "Image block" },
    { type: "gallery", label: "Gallery block" },
    { type: "embed", label: "Video block" },
    { type: "button", label: "Button block" },
    { type: "cta", label: "Call to action block" },
    { type: "faq", label: "FAQ block" },
    { type: "columns", label: "Columns block" },
    { type: "quote", label: "Quote block" },
  ]
  const slashItems = $derived<SlashItem[]>([
    ...FORMATS,
    ...(oninsertblock
      ? BLOCKS.map((b) => ({
          label: b.label,
          hint: "Adds a new block below",
          icon: BLOCK_ICONS[b.type],
          run: () => oninsertblock(b.type),
        }))
      : []),
  ])

  let slash: { query: string; x: number; y: number; from: number } | null =
    $state(null)
  let slashIndex = $state(0)
  const matches = $derived(
    slash
      ? slashItems.filter((i) =>
          i.label
            .toLowerCase()
            .split(/\s+/)
            .some((w) => w.startsWith(slash!.query.toLowerCase())),
        )
      : [],
  )

  function checkSlash(e: Editor) {
    const { $from: at, empty } = e.state.selection
    const text = at.parent.textContent
    if (
      empty &&
      at.parent.type.name === "paragraph" &&
      text.startsWith("/") &&
      at.parentOffset === text.length &&
      text.length <= 24 &&
      !text.includes(" ")
    ) {
      const c = e.view.coordsAtPos(at.pos)
      if (slash?.query !== text.slice(1)) slashIndex = 0
      slash = {
        query: text.slice(1),
        x: c.left,
        y: c.bottom,
        from: at.start(),
      }
    } else slash = null
  }

  function pick(item: SlashItem) {
    const e = editor
    if (!e || !slash) return
    const { from } = slash
    slash = null
    e.chain().focus().deleteRange({ from, to: e.state.selection.from }).run()
    item.run(e)
  }

  const api = (e: Editor): RichApi => ({
    editor: e,
    toggleSource: () => {
      source = true
      if (ctx) ctx.api = null
    },
  })

  $effect(() => {
    if (source || !host || editor) return
    const el = host
    let alive = true
    loadTiptap()
      .then(({ create }) => {
        if (!alive) return
        editor = create({
          element: el,
          markdown: value,
          placeholder,
          label,
          compact,
          onUpdate: (e) => {
            lastEmitted = e.getMarkdown()
            value = lastEmitted
            checkSlash(e)
            ctx?.bump()
          },
          onFocus: (e) => {
            if (ctx) ctx.api = api(e)
            ctx?.bump()
          },
          onSelection: (e) => {
            checkSlash(e)
            ctx?.bump()
          },
          onKeyDown: (k) => {
            if ((k.metaKey || k.ctrlKey) && k.key.toLowerCase() === "k") {
              if (ctx) ctx.linkOpen = true
              return true
            }
            if (!slash || !matches.length) return false
            if (k.key === "ArrowDown") {
              slashIndex = (slashIndex + 1) % matches.length
              return true
            }
            if (k.key === "ArrowUp") {
              slashIndex = (slashIndex - 1 + matches.length) % matches.length
              return true
            }
            if (k.key === "Enter" || k.key === "Tab") {
              pick(matches[slashIndex])
              return true
            }
            if (k.key === "Escape") {
              slash = null
              return true
            }
            return false
          },
        })
      })
      .catch(() => {
        failed = true
        source = true
      })
    return () => {
      alive = false
    }
  })

  // A value set from outside (restoring a revision) replaces what the editor shows.
  $effect(() => {
    const v = value
    if (editor && v !== lastEmitted) {
      lastEmitted = v
      editor.commands.setContent(v, { contentType: "markdown" })
    }
  })

  function toRich() {
    if (needsSource(value)) return
    source = false
  }

  $effect(() => {
    if (source && editor) {
      editor.destroy()
      editor = null
    }
  })

  onDestroy(() => {
    if (ctx && editor && ctx.api?.editor === editor) ctx.api = null
    editor?.destroy()
  })
</script>

<div class="relative" data-rich>
  {#if source}
    <div class="rounded-box border border-base-300 bg-base-200/40">
      <div
        class="flex items-center justify-between gap-2 border-b border-base-300 px-3 py-1 text-xs opacity-70"
      >
        <span
          >{failed
            ? "The editor did not load, so this is Markdown"
            : needsSource(value)
              ? "Markdown (has HTML, so it stays as source)"
              : "Markdown"}</span
        >
        {#if !failed}<button
            type="button"
            class="btn btn-ghost btn-xs"
            disabled={needsSource(value)}
            onclick={toRich}>Rich text</button
          >{/if}
      </div>
      <textarea
        class="block w-full resize-none bg-transparent p-3 font-mono text-sm leading-relaxed focus:outline-none"
        aria-label="{label} (Markdown)"
        maxlength="100000"
        use:autosize
        bind:value
      ></textarea>
    </div>
  {:else}
    {#if !editor}
      <div class="prose max-w-none opacity-60 whitespace-pre-wrap min-h-24">
        {value || placeholder}
      </div>
    {/if}
    <div bind:this={host}></div>
  {/if}

  {#if slash && matches.length}
    <div
      class="fixed z-50 w-64 rounded-box border border-base-300 bg-base-100 p-1 shadow-xl"
      style="left:{slash.x}px;top:{slash.y + 6}px"
      role="listbox"
      aria-label="Insert"
    >
      {#each matches as m, i (m.label)}
        <button
          type="button"
          role="option"
          aria-selected={i === slashIndex}
          class="flex w-full items-center gap-3 rounded-lg px-2 py-1.5 text-left text-sm {i ===
          slashIndex
            ? 'bg-base-200'
            : ''}"
          onmousedown={(e) => {
            e.preventDefault()
            pick(m)
          }}
          onmouseenter={() => (slashIndex = i)}
        >
          <span
            class="grid size-8 shrink-0 place-items-center rounded-lg border border-base-300"
            ><Icon d={m.icon} /></span
          >
          <span
            ><span class="block font-medium">{m.label}</span><span
              class="block text-xs opacity-60">{m.hint}</span
            ></span
          >
        </button>
      {/each}
    </div>
  {/if}
</div>
