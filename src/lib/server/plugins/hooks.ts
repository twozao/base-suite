import type { Db } from "../db"

// Named points where modules and extensions add to what the core does. Hooks are registered in code at
// start-up, so only reviewed code runs; extensions and apps reach them through settings and data.

export type HeadContext = {
  db: Db
  url: URL
  siteName: string
  logoUrl: string | null
  /** Breadcrumb trail for the current page, from home to here */
  trail: { name: string; path: string }[]
}

type Hooks = {
  /** Structured data (schema.org objects) to put in the page head. */
  "page.head": (
    ctx: HeadContext,
  ) => Promise<Record<string, unknown>[]> | Record<string, unknown>[]
}

const registry: { [K in keyof Hooks]: Hooks[K][] } = { "page.head": [] }

export const addHook = <K extends keyof Hooks>(name: K, fn: Hooks[K]) => {
  registry[name].push(fn)
}

/** Runs every handler for a hook; one failing handler does not stop the others. */
export const runHeadHooks = async (ctx: HeadContext) => {
  const out: Record<string, unknown>[] = []
  for (const fn of registry["page.head"]) {
    try {
      out.push(...(await fn(ctx)))
    } catch (e) {
      console.error("page.head hook failed", e instanceof Error ? e.message : e)
    }
  }
  return out
}
