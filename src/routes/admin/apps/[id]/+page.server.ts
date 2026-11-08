import { error, fail, redirect } from "@sveltejs/kit"
import { requirePermission } from "$lib/server/auth/staff"
import { audit } from "$lib/server/audit"
import { parseStringList } from "$lib/server/db/json"
import { isUuid } from "$lib/server/ids"
import {
  appBlockListSchema,
  APP_SECRET_CONTEXT,
  callApp,
  signBody,
} from "$lib/server/plugins/apps"
import { openValue } from "$lib/server/security/vault"
import type { Actions, PageServerLoad, RequestEvent } from "./$types"

const find = async (event: RequestEvent) => {
  if (!isUuid(event.params.id)) error(404, "Not found")
  const app = await event.locals.db
    .selectFrom("apps")
    .selectAll()
    .where("id", "=", event.params.id)
    .executeTakeFirst()
  if (!app) error(404, "App not found")
  return app
}

export const load: PageServerLoad = async (event) => {
  const staff = await requirePermission(event, "plugins.manage")
  const app = await find(event)
  let frame: string | null = null
  if (app.enabled && app.admin_path) {
    // The app's screen learns who is looking from a signed, short-lived context; it cannot act as them.
    const secret = openValue(app.secret, APP_SECRET_CONTEXT(app.id))
    if (secret) {
      const ctx = JSON.stringify({
        site: event.url.origin,
        user: staff.userId,
        at: Date.now(),
      })
      const u = new URL(app.base_url + app.admin_path)
      u.searchParams.set("context", ctx)
      u.searchParams.set("signature", await signBody(secret, ctx))
      frame = u.toString()
      event.locals.frameOrigin = new URL(app.base_url).origin
    }
  }
  const hooks = await event.locals.db
    .selectFrom("webhooks")
    .select(["events", "active"])
    .where("app_id", "=", app.id)
    .execute()
  return {
    app: {
      id: app.id,
      name: app.name,
      base_url: app.base_url,
      admin_path: app.admin_path,
      enabled: !!app.enabled,
      scopes: parseStringList(app.scopes),
      blocks: JSON.parse(app.blocks) as { name: string; label: string }[],
    },
    events: hooks.flatMap((h) => parseStringList(h.events)),
    frame,
  }
}

export const actions: Actions = {
  refresh: async (event) => {
    await requirePermission(event, "plugins.manage")
    const app = await find(event)
    const answer = (await callApp(event.locals.db, app.id, "/manifest", {
      site: event.url.origin,
    })) as { blocks?: unknown } | null
    if (!answer) return fail(400, { error: "The app did not answer /manifest" })
    const blocks = appBlockListSchema.safeParse(answer.blocks ?? [])
    if (!blocks.success)
      return fail(400, { error: "The app's block list is not valid" })
    await event.locals.db
      .updateTable("apps")
      .set({ blocks: JSON.stringify(blocks.data) })
      .where("id", "=", app.id)
      .execute()
    await audit(
      event,
      "app.saved",
      { type: "app", id: app.id },
      { blocks: blocks.data.length },
    )
    return {
      message: `Found ${blocks.data.length} block${blocks.data.length === 1 ? "" : "s"}`,
    }
  },
  toggle: async (event) => {
    await requirePermission(event, "plugins.manage")
    const app = await find(event)
    const enabled = app.enabled ? 0 : 1
    const db = event.locals.db
    await db
      .updateTable("apps")
      .set({ enabled })
      .where("id", "=", app.id)
      .execute()
    await db
      .updateTable("webhooks")
      .set({ active: enabled })
      .where("app_id", "=", app.id)
      .execute()
    await audit(
      event,
      "app.saved",
      { type: "app", id: app.id },
      { enabled: !!enabled },
    )
    return {
      message: enabled
        ? "App switched on"
        : "App switched off: its token, events and blocks stop working",
    }
  },
  delete: async (event) => {
    await requirePermission(event, "plugins.manage")
    const app = await find(event)
    const db = event.locals.db
    await db
      .updateTable("api_tokens")
      .set({ revoked_at: new Date().toISOString() })
      .where("app_id", "=", app.id)
      .execute()
    await db.deleteFrom("webhooks").where("app_id", "=", app.id).execute()
    await db.deleteFrom("apps").where("id", "=", app.id).execute()
    await audit(
      event,
      "app.deleted",
      { type: "app", id: app.id },
      { name: app.name },
    )
    redirect(303, "/admin/apps")
  },
}
