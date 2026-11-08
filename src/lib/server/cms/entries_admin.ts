import type { Db } from "../db"
import type { ContentType } from "./types"

/** Options for each relation field: entries of the linked type, by title. */
export const relationOptions = async (db: Db, type: ContentType) => {
  const out: Record<string, { id: string; title: string }[]> = {}
  for (const f of type.fields) {
    if (f.type !== "relation" || out[f.relation]) continue
    out[f.relation] = await db
      .selectFrom("content_entries as e")
      .innerJoin("content_types as t", "t.id", "e.type_id")
      .select(["e.id", "e.title"])
      .where("t.slug", "=", f.relation)
      .orderBy("e.title")
      .limit(500)
      .execute()
  }
  return out
}

/** Stored field values as strings, the way the form shows them. */
export const fieldStrings = (values: Record<string, unknown>) =>
  Object.fromEntries(
    Object.entries(values).map(([k, v]) => [
      k,
      v === null || v === undefined
        ? ""
        : v === true
          ? "1"
          : v === false
            ? ""
            : String(v),
    ]),
  )
