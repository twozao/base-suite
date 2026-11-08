import type { Db } from "./db"
import { listMedia, VARIANT_RE } from "./media"

/** Media files with their details from the media table; resized copies are folded into their original. */
export const mediaLibrary = async (db: Db) => {
  const { files, error } = await listMedia()
  const originals = files.filter((f) => !VARIANT_RE.test(f.name))
  const rows = originals.length
    ? await db
        .selectFrom("media")
        .select([
          "name",
          "alt",
          "width",
          "height",
          "focal_x",
          "focal_y",
          "variants",
        ])
        .where("name", "in", originals.map((f) => f.name).slice(0, 500))
        .execute()
    : []
  const byName = new Map(rows.map((r) => [r.name, r]))
  return {
    error,
    files: originals.map((f) => {
      const r = byName.get(f.name)
      return {
        ...f,
        alt: r?.alt ?? "",
        width: r?.width ?? null,
        height: r?.height ?? null,
        focalX: r?.focal_x ?? 50,
        focalY: r?.focal_y ?? 50,
        variants: r ? (JSON.parse(r.variants) as number[]) : [],
      }
    }),
  }
}
