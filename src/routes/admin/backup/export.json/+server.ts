import { requirePermission } from "$lib/server/auth/staff"
import { audit } from "$lib/server/audit"
import { exportSite } from "$lib/server/backup"
import type { RequestHandler } from "./$types"

export const GET: RequestHandler = async (event) => {
  await requirePermission(event, "settings.manage")
  const data = await exportSite(event.locals.db)
  await audit(event, "backup.exported", { type: "backup", id: data.exportedAt })
  return new Response(JSON.stringify(data), {
    headers: {
      "content-type": "application/json",
      "content-disposition": `attachment; filename="site-backup-${data.exportedAt.slice(0, 10)}.json"`,
      "cache-control": "private, no-store",
    },
  })
}
