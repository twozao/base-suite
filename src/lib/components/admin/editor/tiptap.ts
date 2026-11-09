import type { Editor } from "@tiptap/core"

// TipTap loads only when a text block mounts, so other admin pages do not ship the editor.
let loading: Promise<{
  create: (opts: CreateOptions) => Editor
}> | null = null

export type CreateOptions = {
  element: HTMLElement
  markdown: string
  placeholder: string
  label: string
  compact: boolean
  onUpdate: (editor: Editor) => void
  onFocus: (editor: Editor) => void
  onSelection: (editor: Editor) => void
  onKeyDown: (e: KeyboardEvent) => boolean
}

export const loadTiptap = () =>
  (loading ??= Promise.all([
    import("@tiptap/core"),
    import("@tiptap/starter-kit"),
    import("@tiptap/markdown"),
    import("@tiptap/extensions"),
    import("@tiptap/extension-image"),
    import("@tiptap/extension-table"),
  ]).then(([core, kit, md, ext, img, table]) => ({
    create: (o: CreateOptions) =>
      new core.Editor({
        element: o.element,
        extensions: [
          kit.StarterKit.configure({
            heading: { levels: [2, 3, 4] },
            underline: false,
            link: {
              openOnClick: false,
              autolink: true,
              HTMLAttributes: { rel: null, target: null },
            },
          }),
          md.Markdown,
          ext.Placeholder.configure({ placeholder: o.placeholder }),
          img.Image,
          table.TableKit.configure({ table: { resizable: false } }),
        ],
        content: o.markdown,
        contentType: "markdown",
        editorProps: {
          attributes: {
            class: `rich-text prose max-w-none focus:outline-none prose-a:text-primary ${o.compact ? "prose-sm min-h-16" : "min-h-24"}`,
            "aria-label": o.label,
            role: "textbox",
            "aria-multiline": "true",
          },
          handleKeyDown: (_view, e) => o.onKeyDown(e),
        },
        onUpdate: ({ editor }) => o.onUpdate(editor),
        onFocus: ({ editor }) => o.onFocus(editor),
        onSelectionUpdate: ({ editor }) => o.onSelection(editor),
        onTransaction: ({ editor }) => o.onSelection(editor),
      }),
  })))

/** Markdown the rich editor cannot show faithfully (raw HTML), so it opens as source. */
export const needsSource = (md: string) => /<\/?[a-zA-Z][^>]*>/.test(md)

/** Links may be site paths, anchors, https, http or mailto. */
export const safeHref = (raw: string) => {
  const v = raw.trim()
  if (!v) return ""
  if (/^(\/|#)/.test(v) || /^(https?:|mailto:)/i.test(v)) return v
  if (/^[\w.-]+\.[a-z]{2,}(\/.*)?$/i.test(v)) return `https://${v}`
  return ""
}
