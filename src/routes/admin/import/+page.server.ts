import { fail } from "@sveltejs/kit"
import { requireModule, requirePermission } from "$lib/server/auth/staff"
import { audit } from "$lib/server/audit"
import { bumpCacheVersion } from "$lib/server/cache"
import { importImage } from "$lib/server/media"
import { invalidateRedirects } from "$lib/server/redirects"
import {
  importWxr,
  MAX_IMPORT_BYTES,
  parseWxr,
  remoteImages,
  replaceImageUrl,
} from "$lib/server/cms/wordpress"
import type { Actions, PageServerLoad } from "./$types"

export const load: PageServerLoad = async (event) => {
  requireModule("cms")
  await requirePermission(event, "settings.manage")
  const db = event.locals.db
  const imports = await db
    .selectFrom("wp_imports")
    .select(["id", "origin", "filename", "counts_json", "created_at"])
    .orderBy("id", "desc")
    .limit(10)
    .execute()
  const latest = imports[0]
  return {
    imports: imports.map((i) => ({
      ...i,
      counts: JSON.parse(i.counts_json) as Record<string, number>,
    })),
    pendingImages: latest ? (await remoteImages(db, latest.origin)).length : 0,
  }
}

const IMAGES_PER_RUN = 8

export const actions: Actions = {
  wordpress: async (event) => {
    requireModule("cms")
    const staff = await requirePermission(event, "settings.manage")
    const file = (await event.request.formData()).get("file")
    if (!(file instanceof File) || !file.size)
      return fail(400, { error: "Choose the export file" })
    if (file.size > MAX_IMPORT_BYTES)
      return fail(400, { error: "The file is larger than 20 MB" })
    const parsed = parseWxr(await file.text())
    if ("error" in parsed) return fail(400, { error: parsed.error })
    const db = event.locals.db
    const counts = await importWxr(db, parsed, staff.userId)
    await db
      .insertInto("wp_imports")
      .values({
        origin: parsed.origin.slice(0, 300),
        filename: file.name.slice(0, 200),
        counts_json: JSON.stringify(counts),
        created_by: staff.userId,
      })
      .execute()
    invalidateRedirects()
    await bumpCacheVersion(db)
    await audit(
      event,
      "import.wordpress",
      { type: "import", id: parsed.origin.slice(0, 100) },
      counts,
    )
    return {
      message: `Imported ${counts.posts} posts, ${counts.pages} pages and ${counts.entries} other entries${counts.types ? ` in ${counts.types} new content types` : ""}. ${counts.redirects} redirects added, ${counts.skipped} skipped because the address was taken.`,
    }
  },
  images: async (event) => {
    requireModule("cms")
    await requirePermission(event, "settings.manage")
    const db = event.locals.db
    const latest = await db
      .selectFrom("wp_imports")
      .select("origin")
      .orderBy("id", "desc")
      .executeTakeFirst()
    if (!latest) return fail(400, { error: "Import a WordPress file first" })
    const todo = (await remoteImages(db, latest.origin)).slice(
      0,
      IMAGES_PER_RUN,
    )
    let copied = 0
    const failed: string[] = []
    for (const url of todo) {
      const r = await importImage(db, url)
      if ("error" in r) {
        failed.push(`${url}: ${r.error}`)
        // Mark it as handled so a broken address does not block the rest.
        await db
          .insertInto("media")
          .values({
            name: `missing-${crypto.randomUUID()}`,
            source_url: url.slice(0, 1000),
          })
          .execute()
        continue
      }
      await replaceImageUrl(db, url, `/media/${r.name}`)
      copied++
    }
    await bumpCacheVersion(db)
    const left = (await remoteImages(db, latest.origin)).length
    return {
      message: `Copied ${copied} image${copied === 1 ? "" : "s"}. ${left ? `${left} left: run it again.` : "All images are copied."}`,
      error: failed.length
        ? `Could not copy: ${failed.slice(0, 3).join("; ")}`
        : undefined,
    }
  },
}
