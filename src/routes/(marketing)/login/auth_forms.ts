import { fail } from "@sveltejs/kit"
import { z } from "zod"
import { PASSWORD_MAX, PASSWORD_MIN } from "$lib/server/auth/password"

export const emailField = z
  .string()
  .trim()
  .min(1, "Email is required")
  .max(320, "That email address is too long")
  .email("Enter a valid email address")

export const newPasswordField = z
  .string()
  .min(PASSWORD_MIN, `Use at least ${PASSWORD_MIN} characters`)
  .max(PASSWORD_MAX, `Use at most ${PASSWORD_MAX} characters`)

/** Parses the named fields with the schema; on failure returns a 400 with the message and the text values echoed. */
export const parseAuthForm = async <
  S extends z.ZodTypeAny,
  E extends string = never,
>(
  request: Request,
  schema: S,
  keys: readonly string[],
  echo: readonly E[] = [],
) => {
  const form = await request.formData()
  const raw = Object.fromEntries(
    keys.map((k) => [k, String(form.get(k) ?? "")]),
  )
  const parsed = schema.safeParse(raw)
  const values = Object.fromEntries(echo.map((k) => [k, raw[k]])) as Record<
    E,
    string
  >
  if (parsed.success)
    return { ok: true as const, data: parsed.data as z.output<S>, values }
  return {
    ok: false as const,
    failure: fail(400, { error: parsed.error.issues[0].message, ...values }),
  }
}
