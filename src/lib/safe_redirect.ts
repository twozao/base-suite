/**
 * Returns `next` only if it is a same-site relative path, otherwise `fallback`.
 * Blocks open redirects such as `//evil.com`, `/\evil.com` and `https://…`.
 */
export const safeNextPath = (
  next: string | null | undefined,
  fallback = "/account",
): string => {
  if (!next || next.length > 1000) return fallback
  if (!next.startsWith("/") || next.startsWith("//")) return fallback
  if (next.includes("\\")) return fallback
  // Reject control characters (e.g. tab/newline tricks)
  for (let i = 0; i < next.length; i++) {
    const code = next.charCodeAt(i)
    if (code < 0x20 || code === 0x7f) return fallback
  }
  try {
    const url = new URL(next, "https://placeholder.invalid")
    if (url.origin !== "https://placeholder.invalid") return fallback
    return url.pathname + url.search + url.hash
  } catch {
    return fallback
  }
}
