// Database maintenance from the command line: npm run db:migrate | db:seed [-- PROFILE] | db:profiles | db:admin -- EMAIL
// Uses DATABASE_URL from the environment (SQLite file by default), like the app.
import { readFileSync } from "node:fs"
import { connect } from "../src/lib/server/db/index"
import { applySeedProfile, seedSampleContent } from "../src/lib/server/db/seed"
import { SEED_PROFILES } from "../src/lib/server/db/profiles"
import { getSettings, saveSetting } from "../src/lib/server/settings"
import { createUser, markEmailVerified } from "../src/lib/server/auth/users"
import { createAssistant } from "../packages/assistant/src/index"
import { CompiledQuery } from "kysely"

const loadDotEnv = () => {
  try {
    for (const line of readFileSync(".env", "utf8").split("\n")) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)
      if (!m || process.env[m[1]] !== undefined) continue
      process.env[m[1]] = m[2].replace(/^(['"])(.*)\1$/, "$2")
    }
  } catch {
    /* no .env */
  }
}

const main = async () => {
  loadDotEnv()
  const [command, arg] = process.argv.slice(2)
  const { db, dialect } = await connect(process.env.DATABASE_URL ?? "")
  try {
    if (command === "migrate") {
      console.log(`${dialect}: schema is up to date`)
    } else if (command === "seed" && arg) {
      const written = await applySeedProfile(db, arg)
      console.log(`applied profile ${arg}: ${written.length} items written`)
    } else if (command === "profiles") {
      for (const p of Object.values(SEED_PROFILES))
        console.log(`${p.id.padEnd(12)} ${p.label}: ${p.summary}`)
    } else if (command === "seed") {
      const added = await seedSampleContent(db)
      console.log(
        added.length
          ? `seeded ${added.join(", ")}`
          : "sample content already present",
      )
    } else if (command === "signin-reset") {
      // Way back in if a provider's keys stop working while password sign-in is off.
      const { signin } = await getSettings(db)
      await saveSetting(
        db,
        "signin",
        { ...signin, enabled: true, password: true },
        null,
      )
      console.log(
        "sign-in is on with email and password; a running app picks this up within 30 seconds",
      )
    } else if (command === "demo" && arg) {
      // A public demo: one sample site, sign-up closed, one admin, and the AI chat on in keyword mode.
      const email = process.env.DEMO_ADMIN_EMAIL ?? "admin@example.com"
      const password = process.env.DEMO_ADMIN_PASSWORD ?? ""
      if (password.length < 12)
        throw new Error("set DEMO_ADMIN_PASSWORD to at least 12 characters")
      await applySeedProfile(db, arg)
      const s = await getSettings(db)
      await saveSetting(db, "signin", { ...s.signin, allowSignUp: false }, null)
      await saveSetting(
        db,
        "modules",
        { switches: { ...s.modules.switches, assistant: true } },
        null,
      )
      const made = await createUser(db, { email, password })
      if (!made.ok) throw new Error(`could not create ${email}`)
      await markEmailVerified(db, made.user.id)
      await db
        .insertInto("user_roles")
        .values({ user_id: made.user.id, role: "admin" })
        .execute()
      const assistant = createAssistant({
        db: {
          all: async (q, p = []) =>
            (await db.executeQuery(CompiledQuery.raw(q, p as never[])))
              .rows as Record<string, unknown>[],
          run: async (q, p = []) => {
            await db.executeQuery(CompiledQuery.raw(q, p as never[]))
          },
        },
        secretKey: "unused-in-this-script",
      })
      // No details form: a demo should not collect visitors' names and emails.
      await assistant.store.saveSettings({
        enabled: true,
        allowPublic: true,
        visitorForm: {
          ...(await assistant.getSettings()).visitorForm,
          enabled: false,
        },
      })
      console.log(`demo ${arg} ready; admin is ${email}`)
    } else if (command === "admin") {
      const email = (arg ?? "").trim().toLowerCase()
      const user = await db
        .selectFrom("users")
        .select("id")
        .where("email", "=", email)
        .executeTakeFirst()
      if (!user)
        throw new Error(`no account with email ${email}; sign up first`)
      await db
        .insertInto("user_roles")
        .values({ user_id: user.id, role: "admin" })
        .onConflict((oc) => oc.columns(["user_id", "role"]).doNothing())
        .execute()
      console.log(`${email} is an admin`)
    } else {
      throw new Error(
        "usage: db.ts migrate | seed [PROFILE] | profiles | signin-reset | admin EMAIL | demo PROFILE",
      )
    }
  } finally {
    await db.destroy()
  }
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e)
  process.exit(1)
})
