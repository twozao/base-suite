import { z } from "zod"

// A form is a list of typed fields stored as JSON. Answers keep the label asked at the time,
// so editing a form later cannot change what an earlier submission means.
export const FIELD_KINDS = [
  "text",
  "email",
  "phone",
  "textarea",
  "number",
  "date",
  "select",
  "radio",
  "checkbox",
] as const
export type FieldKind = (typeof FIELD_KINDS)[number]

export const fieldSchema = z
  .object({
    id: z.string().regex(/^[a-z0-9_-]{1,40}$/),
    label: z.string().trim().min(1, "Each field needs a label").max(200),
    kind: z.enum(FIELD_KINDS),
    required: z.boolean(),
    help: z.string().trim().max(300),
    options: z.array(z.string().trim().min(1).max(120)).max(30),
  })
  .refine(
    (f) => !["select", "radio"].includes(f.kind) || f.options.length > 0,
    {
      message: "Choice fields need at least one option",
    },
  )
export type FormField = z.output<typeof fieldSchema>

export const formSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(200),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .regex(
      /^[a-z0-9]+(-[a-z0-9]+)*$/,
      "Use lowercase letters, numbers and dashes",
    )
    .max(80),
  description: z.string().trim().max(1000),
  submit_label: z.string().trim().min(1).max(60),
  success_message: z.string().trim().min(1).max(500),
  notify_admin: z.boolean(),
  active: z.boolean(),
  fields: z.array(fieldSchema).max(40),
})

export const parseFields = (json: string): FormField[] => {
  try {
    return z.array(fieldSchema).parse(JSON.parse(json))
  } catch {
    return []
  }
}

export type Answer = { label: string; value: string }

/** Validates one submission against the form's fields. */
export const parseSubmission = (
  fields: FormField[],
  read: (id: string) => string,
):
  | { ok: true; answers: Answer[]; email: string | null; name: string | null }
  | { ok: false; errors: Record<string, string> } => {
  const errors: Record<string, string> = {}
  const answers: Answer[] = []
  let email: string | null = null
  let name: string | null = null
  for (const f of fields) {
    const raw = read(f.id).trim().slice(0, 5000)
    const value = f.kind === "checkbox" ? (raw ? "Yes" : "") : raw
    if (f.required && !value) {
      errors[f.id] =
        f.kind === "checkbox"
          ? "Please tick this box"
          : `${f.label} is required`
      continue
    }
    if (!value) continue
    if (f.kind === "email" && !z.string().email().safeParse(value).success)
      errors[f.id] = "Enter a valid email address"
    else if (f.kind === "number" && Number.isNaN(Number(value)))
      errors[f.id] = "Enter a number"
    else if (f.kind === "date" && !/^\d{4}-\d{2}-\d{2}$/.test(value))
      errors[f.id] = "Enter a date"
    else if (f.kind === "phone" && !/^[+\d\s().-]{5,}$/.test(value))
      errors[f.id] = "Enter a valid phone number"
    else if (["select", "radio"].includes(f.kind) && !f.options.includes(value))
      errors[f.id] = "Choose one of the options"
    if (f.kind === "email" && !email) email = value.toLowerCase()
    if (!name && /\bname\b/i.test(f.label) && f.kind === "text") name = value
    answers.push({ label: f.label, value })
  }
  return Object.keys(errors).length
    ? { ok: false, errors }
    : { ok: true, answers, email, name }
}
