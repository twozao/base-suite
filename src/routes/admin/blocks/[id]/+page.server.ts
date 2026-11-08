import { error, fail, redirect } from "@sveltejs/kit"
import { z } from "zod"
import { parseBlocks } from "$lib/blocks"
import { requireModule, requirePermission } from "$lib/server/auth/staff"
import { readBlocksField, rerenderUsing } from "$lib/server/cms/content"
import { bumpCacheVersion } from "$lib/server/cache"
import { nowIso } from "$lib/server/db/json"
import { isUuid } from "$lib/server/ids"
import { audit } from "$lib/server/audit"
import type { Actions, PageServerLoad, RequestEvent } from "./$types"

const guard = async (event: RequestEvent) => {
  requireModule("cms")
  if (!isUuid(event.params.id)) error(404, "Not found")
  return requirePermission(event, "cms.edit")
}

export const load: PageServerLoad = async (event) => {
  requireModule("cms")
  await requirePermission(event, "cms.write")
  if (!isUuid(event.params.id)) error(404, "Not found")
  const row = await event.locals.db
    .selectFrom("cms_blocks")
    .select(["id", "name", "blocks_json", "updated_at"])
    .where("id", "=", event.params.id)
    .executeTakeFirst()
  if (!row) error(404, "Block not found")
  const used = await event.locals.db
    .selectFrom("cms_pages")
    .select(["title", "id"])
    .where("blocks_json", "like", `%"ref":"${row.id}"%`)
    .limit(50)
    .execute()
  return {
    block: { id: row.id, name: row.name, updated_at: row.updated_at },
    blocks: parseBlocks(row.blocks_json),
    used,
  }
}

export const actions: Actions = {
  save: async (event) => {
    await guard(event)
    const form = await event.request.formData()
    const name = z.string().trim().min(1).max(120).safeParse(form.get("name"))
    if (!name.success) return fail(400, { error: "Give the block a name" })
    const read = readBlocksField(form.get("blocks"))
    if ("error" in read) return fail(400, { error: read.error })
    const inner = read.blocks.filter((b) => b.type !== "reusable")
    const db = event.locals.db
    await db
      .updateTable("cms_blocks")
      .set({
        name: name.data,
        blocks_json: JSON.stringify(inner),
        updated_at: nowIso(),
      })
      .where("id", "=", event.params.id)
      .execute()
    const count = await rerenderUsing(db, event.params.id)
    await bumpCacheVersion(db)
    await audit(
      event,
      "block.saved",
      { type: "block", id: event.params.id },
      { pages: count },
    )
    return {
      message: count
        ? `Saved and updated ${count} page${count === 1 ? "" : "s"}`
        : "Saved",
    }
  },
  delete: async (event) => {
    await guard(event)
    const db = event.locals.db
    await db
      .deleteFrom("cms_blocks")
      .where("id", "=", event.params.id)
      .execute()
    await rerenderUsing(db, event.params.id)
    await bumpCacheVersion(db)
    await audit(event, "block.deleted", { type: "block", id: event.params.id })
    redirect(303, "/admin/blocks")
  },
}
