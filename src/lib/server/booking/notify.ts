import { sendAdminEmail, sendTemplatedEmail } from "$lib/mailer"
import { fromEmail, mailConfigured } from "../auth/flows"
import type { Db } from "../db"
import { nowIso } from "../db/json"
import { getSettings } from "../settings"
import { buildIcs } from "$lib/booking/ics"
import { formatInZone } from "$lib/booking/time"

export type NoticeBooking = {
  id: string
  event_name: string | null
  invitee_name: string | null
  invitee_email: string | null
  invitee_timezone: string | null
  start_time: string | null
  end_time: string | null
  location: string | null
  sequence: number
}

const when = (b: NoticeBooking) =>
  b.start_time
    ? `${formatInZone(b.start_time, b.invitee_timezone ?? "UTC")} (${b.invitee_timezone ?? "UTC"})`
    : ""

const invite = (b: NoticeBooking, siteName: string, canceled = false) =>
  buildIcs({
    uid: `${b.id}@base-suite`,
    title: `${b.event_name ?? "Meeting"} with ${siteName}`,
    start: b.start_time ?? "",
    end: b.end_time ?? "",
    location: b.location ?? "",
    sequence: b.sequence,
    canceled,
  })

const send = async (
  db: Db,
  b: NoticeBooking,
  n: {
    subject: string
    heading: string
    intro: string
    actionLabel?: string
    actionUrl?: string
    ics?: boolean
    canceled?: boolean
  },
) => {
  if (!mailConfigured() || !b.invitee_email) return
  const { brand } = await getSettings(db)
  await sendTemplatedEmail({
    db,
    subject: n.subject,
    to_emails: [b.invitee_email],
    from_email: fromEmail(),
    template_name: "notice",
    template_properties: {
      siteName: brand.siteName,
      color: brand.primaryColor,
      heading: n.heading,
      intro: n.intro,
      details: [
        b.event_name ?? "",
        when(b),
        b.location ? `Where: ${b.location}` : "",
      ]
        .filter(Boolean)
        .join("\n"),
      actionLabel: n.actionLabel ?? "",
      actionUrl: n.actionUrl ?? "",
    },
    attachments: n.ics
      ? [
          {
            filename: "invite.ics",
            content: Buffer.from(invite(b, brand.siteName, n.canceled)),
            contentType: "text/calendar",
          },
        ]
      : undefined,
  })
}

const manageUrl = (origin: string, token: string) =>
  `${origin}/book/manage/${token}`

export const notifyBooked = async (
  db: Db,
  b: NoticeBooking,
  origin: string,
  token: string,
) => {
  await send(db, b, {
    subject: `Confirmed: ${b.event_name} on ${b.start_time ? formatInZone(b.start_time, b.invitee_timezone ?? "UTC", { dateStyle: "medium" }) : ""}`,
    heading: "Your meeting is booked",
    intro: "Here are the details. The calendar invite is attached.",
    actionLabel: "Reschedule or cancel",
    actionUrl: manageUrl(origin, token),
    ics: true,
  })
  await sendAdminEmail({
    db,
    subject: "New booking",
    body: `${b.invitee_name} (${b.invitee_email}) booked "${b.event_name}" for ${when(b)}.\n\nOpen in admin: ${origin}/admin/bookings/${b.id}`,
  })
}

export const notifyRescheduled = async (
  db: Db,
  b: NoticeBooking,
  origin: string,
) => {
  await send(db, b, {
    subject: `Rescheduled: ${b.event_name}`,
    heading: "Your meeting has moved",
    intro:
      "This is the new time. The updated invite is attached. The link in your first email still works.",
    ics: true,
  })
  await sendAdminEmail({
    db,
    subject: "Booking rescheduled",
    body: `${b.invitee_name} (${b.invitee_email}): "${b.event_name}" is now ${when(b)}.\n\nOpen in admin: ${origin}/admin/bookings/${b.id}`,
  })
}

export const notifyCanceled = async (
  db: Db,
  b: NoticeBooking,
  origin: string,
  reason: string | null,
) => {
  await send(db, b, {
    subject: `Cancelled: ${b.event_name}`,
    heading: "Your meeting was cancelled",
    intro:
      "This meeting has been cancelled. You are welcome to book another time.",
    actionLabel: "Book another time",
    actionUrl: `${origin}/book`,
    ics: true,
    canceled: true,
  })
  await sendAdminEmail({
    db,
    subject: "Booking cancelled",
    body: `${b.invitee_name} (${b.invitee_email}) "${b.event_name}" for ${when(b)} was cancelled.${reason ? `\n\nReason: ${reason}` : ""}\n\nOpen in admin: ${origin}/admin/bookings/${b.id}`,
  })
}

/** Sends due reminders. Each row is claimed first, so two app instances cannot both send it. */
export const sendDueReminders = async (db: Db, now = Date.now()) => {
  if (!mailConfigured()) return 0
  const { booking } = await getSettings(db)
  if (!booking.reminderHours) return 0
  const due = await db
    .selectFrom("bookings")
    .selectAll()
    .where("provider", "=", "native")
    .where("status", "=", "scheduled")
    .where("reminder_sent_at", "is", null)
    .where("start_time", ">", new Date(now).toISOString())
    .where(
      "start_time",
      "<=",
      new Date(now + booking.reminderHours * 3_600_000).toISOString(),
    )
    .limit(100)
    .execute()
  let sent = 0
  for (const b of due) {
    const claimed = await db
      .updateTable("bookings")
      .set({ reminder_sent_at: nowIso() })
      .where("id", "=", b.id)
      .where("reminder_sent_at", "is", null)
      .returning("id")
      .executeTakeFirst()
    if (!claimed) continue
    await send(db, b, {
      subject: `Reminder: ${b.event_name}`,
      heading: "Your meeting is coming up",
      intro:
        "A quick reminder. To reschedule or cancel, use the link in your confirmation email.",
    })
    sent++
  }
  return sent
}
