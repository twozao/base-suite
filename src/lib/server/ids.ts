// Matches any Postgres uuid (8-4-4-4-12 hex). zod v4's .uuid() only accepts
// RFC-versioned UUIDs, which would 404 on valid ids created elsewhere.
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export const isUuid = (value: unknown): value is string =>
  typeof value === "string" && UUID_RE.test(value)
