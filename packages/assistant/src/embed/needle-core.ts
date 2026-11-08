import type { EmbeddingEngine } from "./types"

// Needle 3 (cactus-needle 3.0.1): a 34 MB on-device model, here used only for text embeddings.
export const NEEDLE_MODEL = "needle3-3.0.1"
const REVISION = "9da75122d4ca11aa4a667281c9c8ba38a7eed679"
export const NEEDLE_WEIGHTS_URL = `https://huggingface.co/Cactus-Compute/needle3/resolve/${REVISION}/needle3.cact`
export const NEEDLE_WEIGHTS_SHA256 =
  "c9d915eca282ed42d1a09b143b592adb4cc6744ffe2d294adf5cfc5548170c38"
/** The engine reads about 1500 characters; longer text is cut so the cost stays predictable. */
export const MAX_EMBED_CHARS = 1500

type NeedleModule = {
  _malloc(n: number): number
  _needle_load(p: number, n: bigint): number
  HEAPU8: Uint8Array
  ccall(name: string, ret: string, types: string[], args: unknown[]): number
}

/**
 * Loads weights into the wasm heap chunk by chunk rather than holding a second full copy in JavaScript:
 * on Workers the 128 MB limit covers both, and the heap alone peaks near 102 MB.
 */
export const bootNeedle = async (
  mod: NeedleModule,
  weights: ReadableStream<Uint8Array>,
  size: number,
) => {
  const start = mod._malloc(size)
  if (!start) throw new Error("needle: out of memory for weights")
  const reader = weights.getReader()
  let offset = 0
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    if (offset + value.length > size)
      throw new Error("needle: weights larger than expected")
    mod.HEAPU8.set(value, start + offset)
    offset += value.length
  }
  if (offset !== size)
    throw new Error(`needle: weights incomplete (${offset}/${size})`)
  if (mod._needle_load(start, BigInt(size)) < 0)
    throw new Error("needle_load failed")
  if (
    mod.ccall(
      "needle_init",
      "number",
      ["string", "string", "string"],
      ["", "[]", ""],
    ) < 0
  )
    throw new Error("needle_init failed")
  const dim = mod.ccall(
    "needle_embed",
    "number",
    ["string", "number", "number"],
    ["x", 0, 0],
  )
  const out = mod._malloc(dim * 4)
  return (text: string) => {
    const n = mod.ccall(
      "needle_embed",
      "number",
      ["string", "number", "number"],
      [text.slice(0, MAX_EMBED_CHARS), out, dim],
    )
    if (n <= 0) throw new Error("needle_embed failed")
    return Float32Array.from(new Float32Array(mod.HEAPU8.buffer, out, n))
  }
}

/** Reaches an engine running elsewhere: a Cloudflare service binding, or any URL speaking the same small API. */
export const remoteEngine = (
  fetcher: { fetch: typeof fetch },
  model = NEEDLE_MODEL,
): EmbeddingEngine => ({
  model,
  async embed(texts) {
    const res = await fetcher.fetch("https://needle.internal/embed", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ texts }),
    })
    if (!res.ok) {
      const detail = (
        (await res.json().catch(() => ({}))) as { error?: string }
      ).error
      throw new Error(
        `embedding service answered ${res.status}${detail ? `: ${detail}` : ""}`,
      )
    }
    const body = (await res.json()) as { vectors: number[][] }
    return body.vectors.map((v) => Float32Array.from(v))
  },
  async status() {
    try {
      const res = await fetcher.fetch("https://needle.internal/health")
      return (await res.json()) as { state: string; detail?: string }
    } catch (e) {
      return {
        state: "failed",
        detail: e instanceof Error ? e.message : String(e),
      }
    }
  },
})

/** Cloudflare's own embeddings, for accounts that prefer not to run Needle. */
export const workersAiEngine = (
  ai: { run(model: string, input: unknown): Promise<unknown> },
  model = "@cf/baai/bge-m3",
): EmbeddingEngine => ({
  model,
  async embed(texts) {
    const r = (await ai.run(model, {
      text: texts.map((t) => t.slice(0, MAX_EMBED_CHARS)),
    })) as { data: number[][] }
    return r.data.map((v) => Float32Array.from(v))
  },
  async status() {
    return { state: "ready", detail: model }
  },
})
