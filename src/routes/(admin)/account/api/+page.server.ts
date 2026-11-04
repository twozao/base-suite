import { fail, redirect } from "@sveltejs/kit"
import { z } from "zod"
import { env } from "$env/dynamic/private"
import { sendAdminEmail, sendUserEmail } from "$lib/mailer"
import { getSettings } from "$lib/server/settings"
import { nowIso } from "$lib/server/db/json"
import { PASSWORD_MAX, PASSWORD_MIN } from "$lib/server/auth/password"
import {
  clearSessionCookie,
  invalidateUserSessions,
} from "$lib/server/auth/session"
import { sendVerificationEmail } from "$lib/server/auth/flows"
import {
  checkPassword,
  deleteUser,
  updateEmail,
  updatePassword,
} from "$lib/server/auth/users"
import type { Actions, RequestEvent } from "./$types"

// Every form is parsed once here, at the boundary. The result shape (errorMessage, errorFields and the
// echoed text values) is what settings_module.svelte and create_profile/+page.svelte render.
const PROFILE_FIELD_MAX = 50

const currentPassword = z
  .string()
  .min(
    1,
    "Enter your current password. If you forgot it, sign out and use 'Forgot password'.",
  )
  .max(PASSWORD_MAX)

const emailForm = z.object({
  email: z
    .string()
    .trim()
    .min(1, "An email address is required")
    .max(320, "That email address is too long")
    .email("A valid email address is required"),
  currentPassword,
})

const passwordForm = z
  .object({
    newPassword1: z
      .string()
      .min(1, "You must type a new password")
      .min(
        PASSWORD_MIN,
        `The new password must be at least ${PASSWORD_MIN} characters long`,
      )
      .max(
        PASSWORD_MAX,
        `The new password can be at most ${PASSWORD_MAX} characters long`,
      ),
    newPassword2: z.string().min(1, "You must type the new password twice"),
    currentPassword,
  })
  .refine((p) => p.newPassword1 === p.newPassword2, {
    message: "The passwords don't match",
    path: ["newPassword2"],
  })

const deleteForm = z.object({ currentPassword })

const profileText = (label: string, requiredHint: string) =>
  z
    .string()
    .trim()
    .min(1, requiredHint)
    .max(
      PROFILE_FIELD_MAX,
      `${label} must be ${PROFILE_FIELD_MAX} characters or fewer`,
    )

const profileForm = z.object({
  fullName: profileText("Name", "Name is required"),
  companyName: profileText(
    "Company name",
    "Company name is required. If this is a hobby project or personal app, please put your name.",
  ),
  website: profileText(
    "Company website",
    "Company website is required. An app store URL is a good alternative if you don't have a website.",
  ),
})

/** Reads the named fields and validates them. On failure returns the fail() to send back, with text values echoed. */
const parseForm = async <S extends z.ZodTypeAny>(
  request: Request,
  schema: S,
  keys: readonly string[],
  echo = true,
) => {
  const form = await request.formData()
  const raw = Object.fromEntries(keys.map((k) => [k, form.get(k) ?? ""]))
  const parsed = schema.safeParse(raw)
  if (parsed.success)
    return { ok: true as const, data: parsed.data as z.output<S> }
  const values = echo
    ? Object.fromEntries(
        Object.entries(raw).filter(
          ([k, v]) => typeof v === "string" && !/password/i.test(k),
        ),
      )
    : {}
  return {
    ok: false as const,
    failure: fail(400, {
      errorMessage: parsed.error.issues[0].message,
      errorFields: [
        ...new Set(parsed.error.issues.map((i) => String(i.path[0] ?? ""))),
      ],
      ...values,
    }),
  }
}

const requireUser = (locals: RequestEvent["locals"]) => {
  if (!locals.user) redirect(303, "/login")
  return locals.user
}

const wrongPassword = () =>
  fail(400, {
    errorMessage: "Current password is incorrect",
    errorFields: ["currentPassword"],
  })

export const actions: Actions = {
  toggleEmailSubscription: async ({ locals }) => {
    const user = requireUser(locals)
    const current = await locals.db
      .selectFrom("profiles")
      .select("unsubscribed")
      .where("id", "=", user.id)
      .executeTakeFirst()
    const unsubscribed = current?.unsubscribed !== 1
    await locals.db
      .updateTable("profiles")
      .set({ unsubscribed: unsubscribed ? 1 : 0 })
      .where("id", "=", user.id)
      .execute()
    return { unsubscribed }
  },

  updateEmail: async (event) => {
    const { request, locals } = event
    const user = requireUser(locals)
    const form = await parseForm(request, emailForm, [
      "email",
      "currentPassword",
    ])
    if (!form.ok) return form.failure
    const { email } = form.data
    if (!(await checkPassword(locals.db, user.id, form.data.currentPassword)))
      return wrongPassword()
    const result = await updateEmail(locals.db, user.id, email)
    if (!result.ok) {
      return fail(400, {
        errorMessage: "That email address is already in use",
        errorFields: ["email"],
        email,
      })
    }
    await sendVerificationEmail(event, user.id, email.trim().toLowerCase())
    return { email }
  },

  updatePassword: async ({ request, locals }) => {
    const user = requireUser(locals)
    const form = await parseForm(
      request,
      passwordForm,
      ["newPassword1", "newPassword2", "currentPassword"],
      false,
    )
    if (!form.ok) return form.failure
    if (!(await checkPassword(locals.db, user.id, form.data.currentPassword)))
      return wrongPassword()
    await updatePassword(locals.db, user.id, form.data.newPassword1)
    // Other devices are signed out; this session stays.
    await invalidateUserSessions(locals.db, user.id, locals.session?.id)
    return {}
  },

  deleteAccount: async ({ request, locals, cookies }) => {
    const user = requireUser(locals)
    const form = await parseForm(
      request,
      deleteForm,
      ["currentPassword"],
      false,
    )
    if (!form.ok) return form.failure
    if (!(await checkPassword(locals.db, user.id, form.data.currentPassword)))
      return wrongPassword()
    await deleteUser(locals.db, user.id)
    clearSessionCookie(cookies)
    redirect(303, "/")
  },

  updateProfile: async ({ request, locals, url }) => {
    const user = requireUser(locals)
    const form = await parseForm(request, profileForm, [
      "fullName",
      "companyName",
      "website",
    ])
    if (!form.ok) return form.failure
    const { fullName, companyName, website } = form.data

    // The profile row is created at sign-up with updated_at null; the first save fills it in.
    const prior = await locals.db
      .selectFrom("profiles")
      .select("updated_at")
      .where("id", "=", user.id)
      .executeTakeFirst()
    const values = {
      full_name: fullName,
      company_name: companyName,
      website,
      updated_at: nowIso(),
    }
    await locals.db
      .insertInto("profiles")
      .values({ id: user.id, ...values })
      .onConflict((oc) => oc.column("id").doUpdateSet(values))
      .execute()

    if (!prior || prior.updated_at === null) {
      await sendAdminEmail({
        subject: "Profile Created",
        body: `Profile created by ${user.email}\nFull name: ${fullName}\nCompany name: ${companyName}\nWebsite: ${website}`,
      })
      const { brand } = await getSettings(locals.db)
      await sendUserEmail({
        db: locals.db,
        userId: user.id,
        subject: "Welcome!",
        from_email:
          env.PRIVATE_FROM_ADMIN_EMAIL || env.PRIVATE_ADMIN_EMAIL || "",
        template_name: "welcome_email",
        template_properties: {
          companyName: brand.siteName,
          WebsiteBaseUrl: url.origin,
        },
      })
    }
    return { fullName, companyName, website }
  },
}
