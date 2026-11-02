import { error } from "@sveltejs/kit"
import { env } from "$env/dynamic/private"
import { requireModule, requirePermission } from "$lib/server/auth/staff"
import { pageParams } from "$lib/server/pagination"
import { pricingPlans } from "../../(marketing)/pricing/pricing_plans"
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
  const db = event.locals.supabaseServiceRole
  const status = event.url.searchParams.get("status") ?? ""
  const { page, size, from, to } = pageParams(event.url)

  let query = db
    .from("subscriptions")
    .select(
      "id, user_id, stripe_customer_id, status, product_id, current_period_end, cancel_at_period_end, updated_at",
      { count: "exact" },
    )
    .order("updated_at", { ascending: false })
    .range(from, to)
  if (STATUSES.includes(status)) query = query.eq("status", status)

  const [{ data, count, error: e }, active] = await Promise.all([
    query,
    db
      .from("subscriptions")
      .select("product_id")
      .in("status", ["active", "trialing"])
      .limit(10_000),
  ])
  if (e) error(500, "Could not load subscriptions")

  const planName = (productId: string | null) =>
    pricingPlans.find(
      (p) => "stripe_product_id" in p && p.stripe_product_id === productId,
    )?.name ??
    productId ??
    "—"

  const byPlan = new Map<string, number>()
  for (const s of active.data ?? []) {
    const n = planName(s.product_id)
    byPlan.set(n, (byPlan.get(n) ?? 0) + 1)
  }

  return {
    rows: (data ?? []).map((s) => ({ ...s, plan: planName(s.product_id) })),
    total: count ?? 0,
    page,
    size,
    status,
    statuses: STATUSES,
    byPlan: [...byPlan.entries()].map(([plan, count]) => ({ plan, count })),
    webhookConfigured: !!env.PRIVATE_STRIPE_WEBHOOK_SECRET,
  }
}
