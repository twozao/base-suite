import type { D1Database, Fetcher, R2Bucket } from "@cloudflare/workers-types"

/** Cloudflare bindings, set by the server hook on each request. Empty when running on Node. */
export type Bindings = {
  DB?: D1Database
  MEDIA?: R2Bucket
  /** The Needle embedding Worker from packages/assistant, when deployed. */
  NEEDLE?: Fetcher
  /** Workers AI, for the assistant's Cloudflare provider without an API token. */
  AI?: unknown
}

let bindings: Bindings = {}

export const setBindings = (b: Bindings | undefined) => {
  if (b) bindings = b
}

export const platformBindings = () => bindings

type WaitUntil = (p: Promise<unknown>) => void
let waitUntilFn: WaitUntil | null = null

/** Set per request on Cloudflare, so work can finish after the response is sent. */
export const setWaitUntil = (fn: WaitUntil | null) => {
  waitUntilFn = fn
}

/** Runs work after the response on Cloudflare; on Node the process stays up, so it just runs. */
export const background = (p: Promise<unknown>) => {
  const guarded = p.catch((e) =>
    console.error("background task failed", e instanceof Error ? e.message : e),
  )
  if (waitUntilFn) waitUntilFn(guarded)
}
