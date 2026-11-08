import { fail } from "@sveltejs/kit"
import { z } from "zod"
import { requirePermission } from "$lib/server/auth/staff"
import { audit } from "$lib/server/audit"
import { parseStringList } from "$lib/server/db/json"
import {
  EVENTS,
  WEBHOOK_SECRET_CONTEXT,
  emit,
  redeliver,
} from "$lib/server/plugins/events"
import {
  createToken,
  revokeToken,
  SCOPES,
  scopeSchema,
} from "$lib/server/plugins/tokens"
import { randomToken } from "$lib/server/security/crypto"
import { publicHttpsUrl } from "$lib/server/security/outbound"
import { sealValue } from "$lib/server/security/vault"
import type { Actions, PageServerLoad } from "./$types"

export const load: PageServerLoad = async (event) => {
  await requirePermission(event, "plugins.manage")
  const db = event.locals.db
  const [tokens, hooks, deliveries] = await Promise.all([
    db
      .selectFrom("api_tokens")
      .select(["id", "name", "scopes", "app_id", "last_used_at", "created_at"])
      .where("revoked_at", "is", null)
      .orderBy("created_at", "desc")
      .execute(),
    db
      .selectFrom("webhooks")
      .select(["id", "url", "events", "active", "app_id", "created_at"])
      .orderBy("created_at", "desc")
      .execute(),
    db
      .selectFrom("webhook_deliveries as d")
      .innerJoin("webhooks as w", "w.id", "d.webhook_id")
      .select([
        "d.id",
        "d.event",
        "d.status",
        "d.attempts",
        "d.response_code",
        "d.error",
        "d.created_at",
        "w.url",
      ])
      .orderBy("d.id", "desc")
      .limit(50)
      .execute(),
  ])
  return {
    scopes: SCOPES,
    events: EVENTS,
    tokens: tokens.map((t) => ({ ...t, scopes: parseStringList(t.scopes) })),
    hooks: hooks.map((h) => ({ ...h, events: parseStringList(h.events) })),
    deliveries,
  }
}

export const actions: Actions = {
  token: async (event) => {
    const staff = await requirePermission(event, "plugins.manage")
    const form = await event.request.formData()
    const name = z.string().trim().min(1).max(120).safeParse(form.get("name"))
    const scopes = z.array(scopeSchema).min(1).safeParse(form.getAll("scopes"))
    if (!name.success) return fail(400, { error: "Give the token a name" })
    if (!scopes.success)
      return fail(400, { error: "Tick at least one permission" })
    const { id, token } = await createToken(event.locals.db, {
      name: name.data,
      scopes: scopes.data,
      createdBy: staff.userId,
    })
    await audit(
      event,
      "token.created",
      { type: "token", id },
      { scopes: scopes.data },
    )
    return {
      message: "Token created. Copy it now; it is not shown again.",
      token,
    }
  },
  revoke: async (event) => {
    await requirePermission(event, "plugins.manage")
    const id = String((await event.request.formData()).get("id") ?? "")
    await revokeToken(event.locals.db, id)
    await audit(event, "token.revoked", { type: "token", id })
    return { message: "Token revoked" }
  },
  webhook: async (event) => {
    await requirePermission(event, "plugins.manage")
    const form = await event.request.formData()
    const url = String(form.get("url") ?? "").trim()
    const checked = publicHttpsUrl(url)
    if (typeof checked === "string")
      return fail(400, { error: `Address: ${checked}` })
    const events = form
      .getAll("events")
      .map(String)
      .filter((e) => (EVENTS as readonly string[]).includes(e))
    if (!events.length) return fail(400, { error: "Tick at least one event" })
    const id = crypto.randomUUID()
    const secret = `whsec_${randomToken(24)}`
    await event.locals.db
      .insertInto("webhooks")
      .values({
        id,
        url: checked.toString().slice(0, 1000),
        secret: sealValue(secret, WEBHOOK_SECRET_CONTEXT(id)),
        events: JSON.stringify(events),
      })
      .execute()
    await audit(
      event,
      "webhook.saved",
      { type: "webhook", id },
      { url: checked.host },
    )
    return {
      message:
        "Webhook added. Use this secret to check the signature; it is not shown again.",
      secret,
    }
  },
  toggle: async (event) => {
    await requirePermission(event, "plugins.manage")
    const form = await event.request.formData()
    const id = String(form.get("id") ?? "")
    await event.locals.db
      .updateTable("webhooks")
      .set({ active: form.get("active") === "1" ? 1 : 0 })
      .where("id", "=", id)
      .execute()
    await audit(event, "webhook.saved", { type: "webhook", id })
    return { message: "Saved" }
  },
  deleteWebhook: async (event) => {
    await requirePermission(event, "plugins.manage")
    const id = String((await event.request.formData()).get("id") ?? "")
    await event.locals.db.deleteFrom("webhooks").where("id", "=", id).execute()
    await audit(event, "webhook.deleted", { type: "webhook", id })
    return { message: "Webhook removed" }
  },
  test: async (event) => {
    await requirePermission(event, "plugins.manage")
    const n = await emit(event.locals.db, "content.updated", {
      kind: "test",
      id: "test",
      slug: "test",
      title: "Test event from the admin",
    })
    return {
      message: n
        ? `Sent a test event to ${n} webhook${n === 1 ? "" : "s"} that listen for content.updated`
        : "No active webhook listens for content.updated",
    }
  },
  redeliver: async (event) => {
    await requirePermission(event, "plugins.manage")
    const id = Number((await event.request.formData()).get("id"))
    if (!Number.isInteger(id)) return fail(400, { error: "Invalid delivery" })
    const sent = await redeliver(event.locals.db, id)
    return sent
      ? { message: "Delivered" }
      : { error: "Still failing. See the error in the log." }
  },
}
