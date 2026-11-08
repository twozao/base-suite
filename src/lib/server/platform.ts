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
