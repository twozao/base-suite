import {
  blocksSchema,
  blocksToText,
  parseBlocks,
  type Block,
} from "$lib/blocks"
import type { Db } from "../db"
import { nowIso } from "../db/json"
import { renderAppBlock } from "../plugins/apps"
import { renderBlocks } from "./blocks"

/** Reads the editor's hidden blocks field. Returns an error message instead of throwing. */
export const readBlocksField = (
  raw: FormDataEntryValue | null,
): { blocks: Block[] } | { error: string } => {
  if (raw === null || raw === "") return { blocks: [] }
  let json: unknown
  try {
    json = JSON.parse(String(raw))
  } catch {
    return { error: "The content could not be read. Reload and try again." }
  }
  const parsed = blocksSchema.safeParse(json)
  if (!parsed.success) {
    const issue = parsed.error.issues[0]
    const at =
      typeof issue?.path[0] === "number" ? `Block ${issue.path[0] + 1}: ` : ""
    return { error: `${at}${issue?.message ?? "Invalid content"}` }
  }
  return { blocks: parsed.data }
}

/** What gets stored for a body: the blocks, searchable text and the rendered, sanitised HTML. */
export const bodyFrom = async (db: Db, blocks: Block[]) => ({
  blocks_json: JSON.stringify(blocks),
  body_md: blocksToText(blocks),
  body_html: await renderBlocks(db, blocks, {
    renderApp: (b) => renderAppBlock(db, b),
  }),
})

const usesRef = (ref: string) => `%"ref":"${ref.replace(/[%_\\"]/g, "")}"%`

/** Re-renders every page, post and entry that uses a reusable block, after the block changed. */
export const rerenderUsing = async (db: Db, ref: string) => {
  let count = 0
  for (const table of ["cms_pages", "posts", "content_entries"] as const) {
    const rows = await db
      .selectFrom(table)
      .select(["id", "blocks_json"])
      .where("blocks_json", "like", usesRef(ref))
      .execute()
    for (const r of rows) {
      const body = await bodyFrom(db, parseBlocks(r.blocks_json))
      await db
        .updateTable(table)
        .set({ body_html: body.body_html, updated_at: nowIso() })
        .where("id", "=", r.id)
        .execute()
      count++
    }
  }
  return count
}
