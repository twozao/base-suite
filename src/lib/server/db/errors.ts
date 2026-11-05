// Driver errors look different per engine; callers only need to know "was that a unique clash".
export const isUniqueViolation = (e: unknown): boolean => {
  if (!e || typeof e !== "object") return false
  const code = (e as { code?: unknown }).code
  return (
    code === "23505" ||
    code === "SQLITE_CONSTRAINT_UNIQUE" ||
    code === "SQLITE_CONSTRAINT_PRIMARYKEY"
  )
}
