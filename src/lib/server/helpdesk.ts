import type { Db } from "./db"
import { nowIso } from "./db/json"
import { captureLead } from "./crm"
import { randomToken } from "./security/crypto"
import { getSettings } from "./settings"
import { sendAdminEmail, sendTemplatedEmail } from "$lib/mailer"
import { fromEmail, mailConfigured } from "./auth/flows"
import { isModuleEnabled } from "$lib/modules"

export const TICKET_STATUSES = [
  "open",
  "pending",
  "resolved",
  "closed",
] as const
export const TICKET_PRIORITIES = ["low", "normal", "high", "urgent"] as const
export type TicketPriority = (typeof TICKET_PRIORITIES)[number]
export type TicketSource = "portal" | "contact" | "chat" | "email" | "manual"

const HOUR = 3_600_000

export type SlaState = "none" | "met" | "on_track" | "due_soon" | "breached"

/** First response SLA while it is outstanding, else the resolution SLA until the ticket is resolved. */
export const slaState = (
  t: {
    status: string
    first_response_due: string | null
    first_responded_at: string | null
    resolve_due: string | null
    resolved_at: string | null
  },
  now = Date.now(),
): SlaState => {
  const judge = (due: string | null, done: string | null): SlaState => {
    if (!due) return "none"
    const d = Date.parse(due)
    if (done) return Date.parse(done) <= d ? "met" : "breached"
    if (now > d) return "breached"
    return d - now < 4 * HOUR ? "due_soon" : "on_track"
  }
  const first = judge(t.first_response_due, t.first_responded_at)
  if (first === "breached" || first === "due_soon" || first === "on_track")
    return first
  return judge(t.resolve_due, t.resolved_at)
}

export const createTicket = async (
  db: Db,
  input: {
    subject: string
    body: string
    email: string
    name?: string | null
    userId?: string | null
    priority?: TicketPriority
    source: TicketSource
    sourceRef?: string | null
    /** Who wrote the first message. */
    authorKind?: "customer" | "staff"
    authorId?: string | null
    captureInCrm?: boolean
  },
  now = Date.now(),
) => {
  const { helpdesk } = await getSettings(db)
  const priority = input.priority ?? "normal"
  const sla = helpdesk.slas[priority]
  const email = input.email.trim().toLowerCase()
  const row = await db
    .insertInto("helpdesk_tickets")
    .values({
      subject: input.subject.trim().slice(0, 300),
      priority,
      requester_email: email,
      requester_name: input.name?.trim().slice(0, 200) || null,
      user_id: input.userId ?? null,
      source: input.source,
      source_ref: input.sourceRef ?? null,
      public_token: randomToken(),
      first_response_due: new Date(
        now + sla.firstResponseHours * HOUR,
      ).toISOString(),
      resolve_due: new Date(now + sla.resolveHours * HOUR).toISOString(),
    })
    .returning(["id", "public_token"])
    .executeTakeFirstOrThrow()
  await db
    .insertInto("helpdesk_messages")
    .values({
      ticket_id: Number(row.id),
      author_kind: input.authorKind ?? "customer",
      author_id: input.authorId ?? null,
      body: input.body.slice(0, 20000),
    })
    .execute()
  if (input.captureInCrm !== false) {
    await captureLead(db, {
      email,
      name: input.name,
      userId: input.userId,
      source: "helpdesk",
      kind: "note",
      body: `Ticket #${row.id}: ${input.subject}`,
      ref: { type: "ticket", id: String(row.id) },
    })
  }
  return { id: Number(row.id), token: row.public_token }
}

/** The ticket already made from a chat or contact request, so converting twice cannot duplicate it. */
export const ticketFromSource = async (
  db: Db,
  source: TicketSource,
  ref: string,
) => {
  const row = await db
    .selectFrom("helpdesk_tickets")
    .select("id")
    .where("source", "=", source)
    .where("source_ref", "=", ref)
    .executeTakeFirst()
  return row ? Number(row.id) : null
}

const ticketUrl = (origin: string, token: string) => `${origin}/ticket/${token}`

export const addReply = async (
  db: Db,
  ticketId: number,
  input: {
    kind: "customer" | "staff"
    authorId?: string | null
    internal?: boolean
    body: string
    origin: string
  },
) => {
  const t = await db
    .selectFrom("helpdesk_tickets")
    .selectAll()
    .where("id", "=", ticketId)
    .executeTakeFirst()
  if (!t) return false
  const internal = !!input.internal && input.kind === "staff"
  await db
    .insertInto("helpdesk_messages")
    .values({
      ticket_id: ticketId,
      author_kind: input.kind,
      author_id: input.authorId ?? null,
      internal: internal ? 1 : 0,
      body: input.body.slice(0, 20000),
    })
    .execute()
  const now = nowIso()
  if (internal) {
    await db
      .updateTable("helpdesk_tickets")
      .set({ updated_at: now })
      .where("id", "=", ticketId)
      .execute()
    return true
  }
  await db
    .updateTable("helpdesk_tickets")
    .set(
      input.kind === "staff"
        ? {
            status: "pending",
            first_responded_at: t.first_responded_at ?? now,
            updated_at: now,
          }
        : { status: "open", resolved_at: null, updated_at: now },
    )
    .where("id", "=", ticketId)
    .execute()
  if (input.kind === "staff") await notifyCustomer(db, t, input.origin)
  else {
    await sendAdminEmail({
      db,
      subject: `Reply on ticket #${ticketId}`,
      body: `${t.requester_email} replied on "${t.subject}".\n\nOpen in admin: ${input.origin}/admin/helpdesk/${ticketId}`,
    })
  }
  return true
}

const notifyCustomer = async (
  db: Db,
  t: {
    id: number
    subject: string
    requester_email: string
    public_token: string
  },
  origin: string,
) => {
  if (!mailConfigured()) return
  const { brand } = await getSettings(db)
  await sendTemplatedEmail({
    db,
    subject: `[#${t.id}] ${t.subject}`,
    to_emails: [t.requester_email],
    from_email: fromEmail(),
    template_name: "notice",
    template_properties: {
      siteName: brand.siteName,
      color: brand.primaryColor,
      heading: "We replied to your ticket",
      intro:
        "There is a new reply on your support ticket. Open it to read it and respond.",
      details: `Ticket #${t.id}: ${t.subject}`,
      actionLabel: "View your ticket",
      actionUrl: ticketUrl(origin, t.public_token),
    },
  })
}

/** Tells the customer their ticket exists and how to follow it, including guests with no account. */
export const notifyTicketOpened = async (
  db: Db,
  t: { id: number; token: string; subject: string; email: string },
  origin: string,
) => {
  await sendAdminEmail({
    db,
    subject: `New ticket #${t.id}`,
    body: `${t.email}: ${t.subject}\n\nOpen in admin: ${origin}/admin/helpdesk/${t.id}`,
  })
  if (!mailConfigured()) return
  const { brand } = await getSettings(db)
  await sendTemplatedEmail({
    db,
    subject: `[#${t.id}] We received your request`,
    to_emails: [t.email],
    from_email: fromEmail(),
    template_name: "notice",
    template_properties: {
      siteName: brand.siteName,
      color: brand.primaryColor,
      heading: "We received your request",
      intro:
        "A ticket is open and we will reply soon. You can follow it and add details at the link below.",
      details: `Ticket #${t.id}`,
      actionLabel: "View your ticket",
      actionUrl: ticketUrl(origin, t.token),
    },
  })
}

/** Turns a contact request into a ticket, once. No-op when Helpdesk is off. */
export const ticketFromContact = async (
  db: Db,
  c: {
    id: string
    email: string
    name: string
    topic?: string | null
    message: string
    userId?: string | null
  },
  origin: string,
) => {
  if (!isModuleEnabled("helpdesk")) return null
  const existing = await ticketFromSource(db, "contact", c.id)
  if (existing) return existing
  const t = await createTicket(db, {
    subject: c.topic ? `${c.topic} from ${c.name}` : `Message from ${c.name}`,
    body: c.message,
    email: c.email,
    name: c.name,
    userId: c.userId,
    source: "contact",
    sourceRef: c.id,
    captureInCrm: false,
  })
  await notifyTicketOpened(
    db,
    { ...t, subject: c.topic ?? "", email: c.email },
    origin,
  )
  return t.id
}

const INBOUND_REF = /\[#(\d{1,12})\]/

/** Applies an inbound email: a reply when the subject names a ticket from this sender, else a new ticket. */
export const receiveEmail = async (
  db: Db,
  mail: { email: string; name?: string | null; subject: string; text: string },
  origin: string,
) => {
  const email = mail.email.trim().toLowerCase()
  const ref = INBOUND_REF.exec(mail.subject)?.[1]
  if (ref) {
    const t = await db
      .selectFrom("helpdesk_tickets")
      .select(["id", "requester_email"])
      .where("id", "=", Number(ref))
      .executeTakeFirst()
    if (t && t.requester_email === email) {
      await addReply(db, Number(t.id), {
        kind: "customer",
        body: mail.text,
        origin,
      })
      return { ticketId: Number(t.id), created: false }
    }
  }
  const t = await createTicket(db, {
    subject: mail.subject.trim() || "(no subject)",
    body: mail.text,
    email,
    name: mail.name,
    source: "email",
  })
  await notifyTicketOpened(db, { ...t, subject: mail.subject, email }, origin)
  return { ticketId: t.id, created: true }
}
