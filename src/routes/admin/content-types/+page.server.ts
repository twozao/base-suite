import { requirePermission } from "$lib/server/auth/staff"
import { listTypes } from "$lib/server/cms/types"
import type { PageServerLoad } from "./$types"

export const load: PageServerLoad = async (event) => {
  await requirePermission(event, "settings.manage")
  const db = event.locals.db
  const [types, counts] = await Promise.all([
    listTypes(db),
    db
      .selectFrom("content_entries")
      .select(["type_id", (eb) => eb.fn.countAll<number>().as("n")])
      .groupBy("type_id")
      .execute(),
  ])
  return {
    types: types.map((t) => ({
      ...t,
      entries: Number(counts.find((c) => c.type_id === t.id)?.n ?? 0),
    })),
  }
}
