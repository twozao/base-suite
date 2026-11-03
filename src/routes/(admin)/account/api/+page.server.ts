import { fail, redirect } from "@sveltejs/kit"
import { z } from "zod"
import { env } from "$env/dynamic/private"
import { sendAdminEmail, sendUserEmail } from "$lib/mailer"
import { getSettings } from "$lib/server/settings"
import type { Actions, RequestEvent } from "./$types"

// Every form is parsed once here, at the boundary. The result shape (errorMessage, errorFields and the
// echoed text values) is what settings_module.svelte and create_profile/+page.svelte render.
const PROFILE_FIELD_MAX = 50
const PASSWORD_MIN = 6
const PASSWORD_MAX = 72
const RECOVERY_WINDOW_MS = 15 * 60 * 1000

const emailForm = z.object({
  email: z
    .string()
    .trim()
    .min(1, "An email address is required")
    .max(320, "That email address is too long")
    .email("A valid email address is required"),
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
    currentPassword: z.string().max(PASSWORD_MAX),
  })
  .refine((p) => p.newPassword1 === p.newPassword2, {
    message: "The passwords don't match",
    path: ["newPassword2"],
  })

const deleteForm = z.object({
  currentPassword: z
    .string()
    .min(
      1,
      "You must provide your current password to delete your account. If you forgot it, sign out then use 'forgot password' on the sign in page.",
    )
    .max(PASSWORD_MAX),
})

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
        Object.entries(raw).filter(([, v]) => typeof v === "string"),
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

const UNKNOWN_ERROR = "Unknown error. If this persists please contact us."

export const actions: Actions = {
  toggleEmailSubscription: async ({ locals }) => {
    const user = requireUser(locals)
    const { data: currentProfile } = await locals.supabase
      .from("profiles")
      .select("unsubscribed")
      .eq("id", user.id)
      .single()
    const unsubscribed = !currentProfile?.unsubscribed
    const { error } = await locals.supabase
      .from("profiles")
      .update({ unsubscribed })
      .eq("id", user.id)
    if (error) {
      console.error("Error updating subscription status", error)
      return fail(500, { message: "Failed to update subscription status" })
    }
    return { unsubscribed }
  },

  updateEmail: async ({ request, locals }) => {
    requireUser(locals)
    const form = await parseForm(request, emailForm, ["email"])
    if (!form.ok) return form.failure
    const { email } = form.data
    // Supabase only switches the address once the user confirms it (Secure email change).
    const { error } = await locals.supabase.auth.updateUser({ email })
    if (error) {
      console.error("Error updating email", error)
      return fail(500, { errorMessage: UNKNOWN_ERROR, email })
    }
    return { email }
  },

  updatePassword: async ({ request, locals }) => {
    // amr is only on safeGetSession: it tells a password-recovery session from a normal one.
    const { user, amr } = await locals.safeGetSession()
    if (!user) redirect(303, "/login")
    const form = await parseForm(
      request,
      passwordForm,
      ["newPassword1", "newPassword2", "currentPassword"],
      false,
    )
    if (!form.ok) return form.failure
    const { newPassword1, currentPassword } = form.data

    const recovery = amr?.find((x) => x.method === "recovery")
    const isRecoverySession = !!recovery && !currentPassword
    if (isRecoverySession) {
      if (Date.now() - recovery.timestamp * 1000 > RECOVERY_WINDOW_MS) {
        return fail(400, {
          errorMessage:
            'Recovery code expired. Please log out, then use "Forgot Password" on the sign in page to reset your password. Codes are valid for 15 minutes.',
          errorFields: [],
        })
      }
    } else {
      if (!currentPassword) {
        return fail(400, {
          errorMessage:
            "You must include your current password. If you forgot it, sign out then use 'forgot password' on the sign in page.",
          errorFields: ["currentPassword"],
        })
      }
      // Proves the caller knows the current password. Supabase can enforce this too (secure password change).
      const { error } = await locals.supabase.auth.signInWithPassword({
        email: user.email ?? "",
        password: currentPassword,
      })
      if (error) redirect(303, "/login/current_password_error")
    }

    const { error } = await locals.supabase.auth.updateUser({
      password: newPassword1,
    })
    if (error) {
      console.error("Error updating password", error)
      return fail(500, { errorMessage: UNKNOWN_ERROR })
    }
    return {}
  },

  deleteAccount: async ({ request, locals }) => {
    const user = requireUser(locals)
    const form = await parseForm(
      request,
      deleteForm,
      ["currentPassword"],
      false,
    )
    if (!form.ok) return form.failure
    const { error: pwError } = await locals.supabase.auth.signInWithPassword({
      email: user.email ?? "",
      password: form.data.currentPassword,
    })
    if (pwError) redirect(303, "/login/current_password_error")

    const { error } = await locals.supabaseServiceRole.auth.admin.deleteUser(
      user.id,
      true,
    )
    if (error) {
      console.error("Error deleting user", error)
      return fail(500, { errorMessage: UNKNOWN_ERROR })
    }
    await locals.supabase.auth.signOut()
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

    // The profile row is created by a trigger at sign-up with updated_at null; the first save fills it in.
    const { data: priorProfile, error: priorProfileError } =
      await locals.supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single()

    const { error } = await locals.supabase
      .from("profiles")
      .upsert({
        id: user.id,
        full_name: fullName,
        company_name: companyName,
        website,
        updated_at: new Date(),
        unsubscribed: priorProfile?.unsubscribed ?? false,
      })
      .select()
    if (error) {
      console.error("Error updating profile", error)
      return fail(500, {
        errorMessage: UNKNOWN_ERROR,
        fullName,
        companyName,
        website,
      })
    }

    const newProfile =
      priorProfile?.updated_at === null && priorProfileError === null
    if (newProfile) {
      await sendAdminEmail({
        subject: "Profile Created",
        body: `Profile created by ${user.email}\nFull name: ${fullName}\nCompany name: ${companyName}\nWebsite: ${website}`,
      })
      const { brand } = await getSettings(locals.supabaseServiceRole)
      await sendUserEmail({
        user,
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
