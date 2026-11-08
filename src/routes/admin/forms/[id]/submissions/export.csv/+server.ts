import { error } from "@sveltejs/kit"
import { requireModule, requirePermission } from "$lib/server/auth/staff"
import { csvResponse } from "$lib/server/csv"
import { isUuid } from "$lib/server/ids"
import type { RequestHandler } from "./$types"

export const GET: RequestHandler = async (event) => {
  requireModule("forms")
  await requirePermission(event, "forms.manage")
  if (!isUuid(event.params.id)) error(404, "Not found")
  const db = event.locals.db
  const form = await db
    .selectFrom("forms")
    .select(["slug"])
    .where("id", "=", event.params.id)
    .executeTakeFirst()
  if (!form) error(404, "Not found")
  const rows = await db
    .selectFrom("form_submissions")
    .selectAll()
    .where("form_id", "=", event.params.id)
    .orderBy("created_at")
    .execute()
  const parsed = rows.map((r) => ({
    ...r,
    answers: JSON.parse(r.answers) as { label: string; value: string }[],
  }))
  const labels = [
    ...new Set(parsed.flatMap((r) => r.answers.map((a) => a.label))),
  ]
  return csvResponse(
    `${form.slug}-answers.csv`,
    ["Received", "Status", ...labels],
    parsed.map((r) => [
      r.created_at,
      r.status,
      ...labels.map((l) => r.answers.find((a) => a.label === l)?.value ?? ""),
    ]),
  )
}
