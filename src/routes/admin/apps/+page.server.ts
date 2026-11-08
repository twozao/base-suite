import { fail } from "@sveltejs/kit"
import { z } from "zod"
import { requirePermission } from "$lib/server/auth/staff"
import { audit } from "$lib/server/audit"
import { parseStringList } from "$lib/server/db/json"
import { APP_SECRET_CONTEXT, appBaseUrl } from "$lib/server/plugins/apps"
import { EVENTS, WEBHOOK_SECRET_CONTEXT } from "$lib/server/plugins/events"
import { createToken, SCOPES, scopeSchema } from "$lib/server/plugins/tokens"
import { randomToken } from "$lib/server/security/crypto"
import { sealValue } from "$lib/server/security/vault"
import type { Actions, PageServerLoad } from "./$types"

export const load: PageServerLoad = async (event) => {
  await requirePermission(event, "plugins.manage")
  const apps = await event.locals.db
    .selectFrom("apps")
    .select([
      "id",
      "name",
      "base_url",
      "scopes",
      "blocks",
      "enabled",
      "created_at",
    ])
    .orderBy("name")
    .execute()
  return {
    apps: apps.map((a) => ({
      ...a,
      scopes: parseStringList(a.scopes),
      blocks: (JSON.parse(a.blocks) as unknown[]).length,
    })),
    scopes: SCOPES,
    events: EVENTS,
  }
}

export const actions: Actions = {
  register: async (event) => {
    const staff = await requirePermission(event, "plugins.manage")
    const form = await event.request.formData()
    const name = z.string().trim().min(1).max(120).safeParse(form.get("name"))
    if (!name.success) return fail(400, { error: "Give the app a name" })
    const base = appBaseUrl(String(form.get("base_url") ?? ""))
    if (typeof base !== "string")
      return fail(400, { error: `Address: ${base.error}` })
    const adminPath = String(form.get("admin_path") ?? "").trim()
    if (adminPath && !/^\/[A-Za-z0-9/_.-]{0,199}$/.test(adminPath))
      return fail(400, {
        error:
          "Admin screen path: start with / and use letters, numbers, / . _ -",
      })
    const scopes = z.array(scopeSchema).safeParse(form.getAll("scopes"))
    if (!scopes.success) return fail(400, { error: "Unknown permission" })
    const events = form
      .getAll("events")
      .map(String)
      .filter((e) => (EVENTS as readonly string[]).includes(e))
    const db = event.locals.db
    const id = crypto.randomUUID()
    const secret = `app_${randomToken(24)}`
    await db
      .insertInto("apps")
      .values({
        id,
        name: name.data,
        base_url: base,
        admin_path: adminPath || null,
        secret: sealValue(secret, APP_SECRET_CONTEXT(id)),
        scopes: JSON.stringify(scopes.data),
        created_by: staff.userId,
      })
      .execute()
    let token: string | null = null
    if (scopes.data.length)
      token = (
        await createToken(db, {
          name: `App: ${name.data}`,
          scopes: scopes.data,
          createdBy: staff.userId,
          appId: id,
        })
      ).token
    if (events.length) {
      const hookId = crypto.randomUUID()
      await db
        .insertInto("webhooks")
        .values({
          id: hookId,
          url: `${base}/events`,
          secret: sealValue(secret, WEBHOOK_SECRET_CONTEXT(hookId)),
          events: JSON.stringify(events),
          app_id: id,
        })
        .execute()
    }
    await audit(
      event,
      "app.saved",
      { type: "app", id },
      { scopes: scopes.data, events },
    )
    return {
      message: "App connected. Give it these values; they are not shown again.",
      secret,
      token,
      id,
    }
  },
}
