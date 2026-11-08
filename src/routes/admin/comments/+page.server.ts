import { fail } from "@sveltejs/kit"
import { z } from "zod"
import { requireModule, requirePermission } from "$lib/server/auth/staff"
import { audit } from "$lib/server/audit"
import { bumpCacheVersion } from "$lib/server/cache"
import { getSettings, saveSetting } from "$lib/server/settings"
import type { Actions, PageServerLoad } from "./$types"

const STATUSES = ["pending", "approved", "spam"] as const

export const load: PageServerLoad = async (event) => {
  requireModule("cms")
  await requirePermission(event, "comments.moderate")
  const db = event.locals.db
  const status = (STATUSES as readonly string[]).includes(
    event.url.searchParams.get("status") ?? "",
  )
    ? (event.url.searchParams.get("status") as (typeof STATUSES)[number])
    : "pending"
  const [comments, counts, settings] = await Promise.all([
    db
      .selectFrom("comments as c")
      .innerJoin("posts as p", "p.id", "c.post_id")
      .select([
        "c.id",
        "c.author_name",
        "c.author_email",
        "c.body",
        "c.status",
        "c.created_at",
        "p.title",
        "p.slug",
      ])
      .where("c.status", "=", status)
      .orderBy("c.created_at", "desc")
      .limit(200)
      .execute(),
    db
      .selectFrom("comments")
      .select(["status", (eb) => eb.fn.countAll<number>().as("n")])
      .groupBy("status")
      .execute(),
    getSettings(db),
  ])
  return {
    comments,
    status,
    counts: Object.fromEntries(counts.map((c) => [c.status, Number(c.n)])),
    settings: settings.comments,
  }
}

export const actions: Actions = {
  moderate: async (event) => {
    await requirePermission(event, "comments.moderate")
    const form = await event.request.formData()
    const ids = form
      .getAll("id")
      .map(Number)
      .filter(Number.isInteger)
      .slice(0, 200)
    const to = String(form.get("to") ?? "")
    if (!ids.length) return fail(400, { error: "Pick at least one comment" })
    const db = event.locals.db
    if (to === "delete")
      await db.deleteFrom("comments").where("id", "in", ids).execute()
    else if ((STATUSES as readonly string[]).includes(to))
      await db
        .updateTable("comments")
        .set({ status: to as (typeof STATUSES)[number] })
        .where("id", "in", ids)
        .execute()
    else return fail(400, { error: "Unknown action" })
    await bumpCacheVersion(db)
    await audit(
      event,
      "comment.moderated",
      { type: "comment", id: String(ids[0]) },
      { count: ids.length, to },
    )
    return {
      message: `${ids.length} comment${ids.length === 1 ? "" : "s"} ${to === "delete" ? "deleted" : `marked ${to}`}`,
    }
  },
  settings: async (event) => {
    const staff = await requirePermission(event, "settings.manage")
    const form = await event.request.formData()
    const days = z.coerce
      .number()
      .int()
      .min(0)
      .max(3650)
      .safeParse(form.get("closeAfterDays") || 0)
    if (!days.success)
      return fail(400, { error: "Days must be a whole number" })
    await saveSetting(
      event.locals.db,
      "comments",
      {
        enabled: form.get("enabled") === "on",
        requireApproval: form.get("requireApproval") === "on",
        closeAfterDays: days.data,
        notifyAdmin: form.get("notifyAdmin") === "on",
      },
      staff.userId,
    )
    await audit(event, "settings.updated", { type: "settings", id: "comments" })
    return { message: "Comment settings saved" }
  },
}
