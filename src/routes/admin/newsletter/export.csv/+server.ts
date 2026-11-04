import { requireModule, requirePermission } from "$lib/server/auth/staff"
import { audit } from "$lib/server/audit"
import type { RequestHandler } from "./$types"

// Neutralise spreadsheet formula injection (=, +, -, @) and quote safely.
const cell = (v: string | null) => {
  let s = v ?? ""
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`
  return `"${s.replace(/"/g, '""')}"`
}

export const GET: RequestHandler = async (event) => {
  requireModule("newsletter")
  await requirePermission(event, "newsletter.manage")
  const rows = await event.locals.db
    .selectFrom("newsletter_subscribers")
    .select(["email", "name", "source", "confirmed_at"])
    .where("status", "=", "confirmed")
    .orderBy("confirmed_at")
    .limit(100_000)
    .execute()
  const lines = [
    "email,name,source,confirmed_at",
    ...rows.map((r) =>
      [r.email, r.name, r.source, r.confirmed_at].map(cell).join(","),
    ),
  ]
  await audit(event, "newsletter.exported", undefined, { rows: rows.length })
  return new Response(lines.join("\r\n") + "\r\n", {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="subscribers-${new Date().toISOString().slice(0, 10)}.csv"`,
      "cache-control": "private, no-store",
    },
  })
}
