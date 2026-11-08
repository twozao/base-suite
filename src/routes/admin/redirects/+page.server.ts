import { fail } from "@sveltejs/kit"
import { requirePermission } from "$lib/server/auth/staff"
import { audit } from "$lib/server/audit"
import { isUniqueViolation } from "$lib/server/db/errors"
import {
  fromPathSchema,
  invalidateRedirects,
  toUrlSchema,
} from "$lib/server/redirects"
import type { Actions, PageServerLoad } from "./$types"

export const load: PageServerLoad = async (event) => {
  await requirePermission(event, "cms.publish")
  const db = event.locals.db
  const [redirects, notFound] = await Promise.all([
    db
      .selectFrom("redirects")
      .select([
        "id",
        "from_path",
        "to_url",
        "status_code",
        "hits",
        "extension_id",
      ])
      .orderBy("from_path")
      .limit(1000)
      .execute(),
    db
      .selectFrom("not_found_log")
      .select(["path", "hits", "referrer", "last_seen"])
      .orderBy("hits", "desc")
      .limit(100)
      .execute(),
  ])
  return {
    redirects,
    notFound,
    prefill: event.url.searchParams.get("from") ?? "",
  }
}

export const actions: Actions = {
  add: async (event) => {
    await requirePermission(event, "cms.publish")
    const form = await event.request.formData()
    const from = fromPathSchema.safeParse(form.get("from_path"))
    const to = toUrlSchema.safeParse(form.get("to_url"))
    const code = Number(form.get("status_code") ?? 301)
    if (!from.success)
      return fail(400, { error: `From: ${from.error.issues[0].message}` })
    if (!to.success)
      return fail(400, { error: `To: ${to.error.issues[0].message}` })
    if (![301, 302, 307, 308].includes(code))
      return fail(400, { error: "Pick a redirect type" })
    if (from.data === to.data)
      return fail(400, { error: "An address can't redirect to itself" })
    const db = event.locals.db
    try {
      await db
        .insertInto("redirects")
        .values({ from_path: from.data, to_url: to.data, status_code: code })
        .execute()
    } catch (e) {
      if (isUniqueViolation(e))
        return fail(400, { error: "That address already redirects" })
      throw e
    }
    await db.deleteFrom("not_found_log").where("path", "=", from.data).execute()
    invalidateRedirects()
    await audit(
      event,
      "redirect.saved",
      { type: "redirect", id: from.data },
      { to: to.data },
    )
    return { message: "Redirect added" }
  },
  delete: async (event) => {
    await requirePermission(event, "cms.publish")
    const id = Number((await event.request.formData()).get("id"))
    if (!Number.isInteger(id)) return fail(400, { error: "Invalid redirect" })
    await event.locals.db.deleteFrom("redirects").where("id", "=", id).execute()
    invalidateRedirects()
    await audit(event, "redirect.deleted", { type: "redirect", id: String(id) })
    return { message: "Redirect removed" }
  },
  clear404: async (event) => {
    await requirePermission(event, "cms.publish")
    const path = String((await event.request.formData()).get("path") ?? "")
    await event.locals.db
      .deleteFrom("not_found_log")
      .$if(!!path, (q) => q.where("path", "=", path))
      .execute()
    return { message: path ? "Removed from the list" : "404 list cleared" }
  },
}
