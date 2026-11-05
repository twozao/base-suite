import { describe, expect, it } from "vitest"
import { createTestDb } from "../db/test_db"
import { hmacSha256Hex } from "../security/crypto"
import {
  bookingFromWebhook,
  calendlyEmbedUrl,
  calendlyWebhookSchema,
  upsertBooking,
  verifyCalendlySignature,
} from "./calendly"

const key = "test_signing_key"
const body = JSON.stringify({ event: "invitee.created", payload: {} })

const sign = async (t: number, b = body) =>
  `t=${t},v1=${await hmacSha256Hex(key, `${t}.${b}`)}`

describe("verifyCalendlySignature", () => {
  const now = 1_700_000_000_000
  const t = now / 1000

  it("accepts a valid signature", async () => {
    const header = await sign(t)
    expect(
      await verifyCalendlySignature({ header, body, signingKey: key, now }),
    ).toBe(true)
  })
  it("rejects a tampered body", async () => {
    const header = await sign(t)
    expect(
      await verifyCalendlySignature({
        header,
        body: body + " ",
        signingKey: key,
        now,
      }),
    ).toBe(false)
  })
  it("rejects old timestamps (replay)", async () => {
    const header = await sign(t - 600)
    expect(
      await verifyCalendlySignature({ header, body, signingKey: key, now }),
    ).toBe(false)
  })
  it("rejects missing header or key", async () => {
    expect(
      await verifyCalendlySignature({ header: null, body, signingKey: key }),
    ).toBe(false)
    expect(
      await verifyCalendlySignature({
        header: await sign(t),
        body,
        signingKey: "",
        now,
      }),
    ).toBe(false)
  })
})

describe("bookingFromWebhook", () => {
  it("maps a cancellation", () => {
    const hook = calendlyWebhookSchema.parse({
      event: "invitee.canceled",
      payload: {
        uri: "https://api.calendly.com/scheduled_events/E/invitees/I",
        email: "Ann@Example.com",
        name: "Ann",
        cancellation: { reason: "conflict" },
        scheduled_event: {
          uri: "https://api.calendly.com/scheduled_events/E",
          name: "Intro call",
          start_time: "2026-11-10T10:00:00.000000Z",
          end_time: "2026-11-10T10:30:00.000000Z",
        },
      },
    })
    const row = bookingFromWebhook(hook)
    expect(row.status).toBe("canceled")
    expect(row.invitee_email).toBe("ann@example.com")
    expect(row.cancel_reason).toBe("conflict")
  })
})

describe("upsertBooking", () => {
  const payload = {
    uri: "https://api.calendly.com/scheduled_events/E/invitees/I",
    email: "ann@example.com",
    name: "Ann",
    scheduled_event: {
      name: "Intro call",
      start_time: "2026-11-10T10:00:00.000000Z",
    },
  }

  it("creates the row once and a cancellation updates it in place", async () => {
    const db = await createTestDb()
    const created = bookingFromWebhook(
      calendlyWebhookSchema.parse({ event: "invitee.created", payload }),
    )
    await upsertBooking(db, created, null)
    await upsertBooking(db, created, null)
    const canceled = bookingFromWebhook(
      calendlyWebhookSchema.parse({
        event: "invitee.canceled",
        payload: { ...payload, cancellation: { reason: "conflict" } },
      }),
    )
    await upsertBooking(db, canceled, null)
    const rows = await db.selectFrom("bookings").selectAll().execute()
    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({
      external_id: payload.uri,
      event_name: "Intro call",
      status: "canceled",
      cancel_reason: "conflict",
      user_id: null,
    })
  })
})

describe("calendlyEmbedUrl", () => {
  it("adds embed and prefill params", () => {
    const u = new URL(
      calendlyEmbedUrl("https://calendly.com/acme/intro", {
        host: "example.com",
        name: "Ann",
        email: "a@b.co",
      }),
    )
    expect(u.searchParams.get("embed_type")).toBe("Inline")
    expect(u.searchParams.get("email")).toBe("a@b.co")
  })
})
