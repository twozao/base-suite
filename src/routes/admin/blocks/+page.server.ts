import { fail, redirect } from "@sveltejs/kit"
import { z } from "zod"
import { requireModule, requirePermission } from "$lib/server/auth/staff"
import { audit } from "$lib/server/audit"
import type { Actions, PageServerLoad } from "./$types"

export const load: PageServerLoad = async (event) => {
  requireModule("cms")
  await requirePermission(event, "cms.write")
  return {
    blocks: await event.locals.db
      .selectFrom("cms_blocks")
      .select(["id", "name", "extension_id", "updated_at"])
      .orderBy("name")
      .execute(),
  }
}

export const actions: Actions = {
  create: async (event) => {
    requireModule("cms")
    await requirePermission(event, "cms.edit")
    const name = z
      .string()
      .trim()
      .min(1)
      .max(120)
      .safeParse((await event.request.formData()).get("name"))
    if (!name.success) return fail(400, { error: "Give the block a name" })
    const id = crypto.randomUUID()
    await event.locals.db
      .insertInto("cms_blocks")
      .values({
        id,
        name: name.data,
        blocks_json: JSON.stringify([{ type: "markdown", md: "" }]),
      })
      .execute()
    await audit(
      event,
      "block.saved",
      { type: "block", id },
      { name: name.data },
    )
    redirect(303, `/admin/blocks/${id}`)
  },
}
