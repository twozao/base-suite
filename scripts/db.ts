// Database maintenance from the command line: npm run db:migrate | db:seed | db:admin -- EMAIL
// Uses DATABASE_URL from the environment (SQLite file by default), like the app.
import { readFileSync } from "node:fs"
import { connect } from "../src/lib/server/db/index"
import { seedSampleContent } from "../src/lib/server/db/seed"

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
    } else if (command === "seed") {
      const added = await seedSampleContent(db)
      console.log(
        added.length
          ? `seeded ${added.join(", ")}`
          : "sample content already present",
      )
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
      throw new Error("usage: db.ts migrate | seed | admin EMAIL")
    }
  } finally {
    await db.destroy()
  }
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e)
  process.exit(1)
})
