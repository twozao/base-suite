import { requirePermission } from "$lib/server/auth/staff"
import { BUILT_IN_TEMPLATES } from "$lib/server/email"
import type { PageServerLoad } from "./$types"

export const load: PageServerLoad = async (event) => {
  await requirePermission(event, "email.manage")
  const saved = await event.locals.db
    .selectFrom("email_templates")
    .select(["slug", "name", "description", "extension_id", "updated_at"])
    .orderBy("name")
    .execute()
  const bySlug = new Map(saved.map((s) => [s.slug, s]))
  return {
    builtIn: BUILT_IN_TEMPLATES.map((t) => ({
      slug: t.slug,
      name: t.name,
      description: t.description,
      customized: bySlug.has(t.slug),
      extension_id: bySlug.get(t.slug)?.extension_id ?? null,
    })),
    custom: saved.filter(
      (s) => !BUILT_IN_TEMPLATES.some((b) => b.slug === s.slug),
    ),
  }
}
