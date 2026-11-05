import { env } from "$env/dynamic/private"
import { requireModule, requirePermission } from "$lib/server/auth/staff"
import { pageParams } from "$lib/server/pagination"
import { getSettings } from "$lib/server/settings"
import type { PageServerLoad } from "./$types"

const STATUSES = [
  "active",
  "trialing",
  "past_due",
  "canceled",
  "unpaid",
  "incomplete",
  "paused",
]

export const load: PageServerLoad = async (event) => {
  requireModule("subscriptions")
  await requirePermission(event, "billing.view")
  const db = event.locals.db
  const status = event.url.searchParams.get("status") ?? ""
  const { page, size, from } = pageParams(event.url)

  let base = db.selectFrom("subscriptions")
  if (STATUSES.includes(status)) base = base.where("status", "=", status)

  const [rows, { n: total }, active] = await Promise.all([
    base
      .select([
        "id",
        "user_id",
        "stripe_customer_id",
        "status",
        "product_id",
        "current_period_end",
        "cancel_at_period_end",
        "updated_at",
      ])
      .orderBy("updated_at", "desc")
      .limit(size)
      .offset(from)
      .execute(),
    base.select(db.fn.countAll<number>().as("n")).executeTakeFirstOrThrow(),
    db
      .selectFrom("subscriptions")
      .select(["product_id", db.fn.countAll<number>().as("n")])
      .where("status", "in", ["active", "trialing"])
      .groupBy("product_id")
      .execute(),
  ])

  const { plans } = (await getSettings(db)).pricing
  const planName = (productId: string | null) =>
    plans.find((p) => !!p.stripeProductId && p.stripeProductId === productId)
      ?.name ??
    productId ??
    "-"

  const byPlan = new Map<string, number>()
  for (const s of active) {
    const name = planName(s.product_id)
    byPlan.set(name, (byPlan.get(name) ?? 0) + Number(s.n))
  }

  return {
    rows: rows.map((s) => ({
      ...s,
      cancel_at_period_end: s.cancel_at_period_end === 1,
      plan: planName(s.product_id),
    })),
    total: Number(total),
    page,
    size,
    status,
    statuses: STATUSES,
    byPlan: [...byPlan.entries()].map(([plan, count]) => ({ plan, count })),
    webhookConfigured: !!env.PRIVATE_STRIPE_WEBHOOK_SECRET,
  }
}
