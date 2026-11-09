import type { Editor } from "@tiptap/core"

export const EDITOR_CTX = Symbol("rich-editor")

/** What the shared toolbar needs from the text block that has focus. */
export type RichApi = {
  editor: Editor
  toggleSource: () => void
}

/** The text block the shared formatting toolbar acts on; version changes on every edit or cursor move. */
export class ActiveEditor {
  api: RichApi | null = $state.raw(null)
  version = $state(0)
  linkOpen = $state(false)
  bump() {
    this.version++
  }
}
