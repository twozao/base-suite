import { describe, it, expect } from "vitest"
import type Stripe from "stripe"
import { createTestDb } from "../db/test_db"
import { createUser } from "../auth/users"
import { handleStripeEvent } from "./stripe_sync"

const event = (id: string, status: string, cancel = false) =>
  ({
    id,
    type: "customer.subscription.updated",
    data: {
      object: {
        id: "sub_1",
        customer: "cus_1",
        status,
        cancel_at_period_end: cancel,
        current_period_end: 1800000000,
        items: { data: [{ price: { id: "price_1", product: "prod_1" } }] },
      },
    },
  }) as unknown as Stripe.Event

describe("handleStripeEvent", () => {
  it("mirrors the subscription once per event and links it to the user", async () => {
    const db = await createTestDb()
    const r = await createUser(db, {
      email: "a@example.com",
      password: "pw-pw-pw",
    })
    const userId = (r as { user: { id: string } }).user.id
    await db
      .insertInto("stripe_customers")
      .values({ user_id: userId, stripe_customer_id: "cus_1" })
      .execute()
    expect(await handleStripeEvent(db, event("evt_1", "active"))).toEqual({
      status: "processed",
    })
    expect(await handleStripeEvent(db, event("evt_1", "active"))).toEqual({
      status: "duplicate",
    })
    expect(
      await handleStripeEvent(db, event("evt_2", "canceled", true)),
    ).toEqual({ status: "processed" })
    const rows = await db.selectFrom("subscriptions").selectAll().execute()
    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({
      user_id: userId,
      status: "canceled",
      cancel_at_period_end: 1,
      product_id: "prod_1",
    })
    expect(
      await handleStripeEvent(db, {
        ...event("evt_3", "active"),
        type: "charge.succeeded",
      } as Stripe.Event),
    ).toEqual({ status: "ignored" })
  })
})
