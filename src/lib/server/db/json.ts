import type { Json } from "./schema"

/** JSON columns are text in every dialect; a bad row falls back instead of breaking the page. */
export const parseJson = <T extends Json>(
  text: string | null,
  fallback: T,
): T => {
  if (text === null || text === "") return fallback
  try {
    return JSON.parse(text) as T
  } catch {
    return fallback
  }
}

export const parseStringList = (text: string | null): string[] =>
  parseJson<Json>(text, []) instanceof Array
    ? (parseJson<Json[]>(text, []).filter(
        (v) => typeof v === "string",
      ) as string[])
    : []

export const nowIso = () => new Date().toISOString()
