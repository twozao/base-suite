import { join } from "node:path"
import { Worker } from "node:worker_threads"
import {
  MAX_EMBED_CHARS,
  NEEDLE_MODEL,
  NEEDLE_WEIGHTS_SHA256,
  NEEDLE_WEIGHTS_URL,
} from "./needle-core"
import type { EmbeddingEngine } from "./types"

const TIMEOUT_MS = 30_000
const RETRY_AFTER_MS = 5 * 60_000

/** Needle on Node. `packageDir` is this package's folder on disk, since bundlers move the module itself. */
export const needleNodeEngine = (opts: {
  packageDir: string
  cacheDir: string
}): EmbeddingEngine => {
  let worker: Worker | null = null
  let state: "off" | "loading" | "ready" | "failed" = "off"
  let lastError = ""
  let failedAt = 0
  let nextId = 1
  const pending = new Map<
    number,
    {
      resolve: (v: Float32Array) => void
      reject: (e: Error) => void
      timer: ReturnType<typeof setTimeout>
    }
  >()

  const fail = (error: string) => {
    state = "failed"
    lastError = error.slice(0, 300)
    failedAt = Date.now()
    for (const p of pending.values()) {
      clearTimeout(p.timer)
      p.reject(new Error(lastError))
    }
    pending.clear()
    void worker?.terminate()
    worker = null
  }
  const start = () => {
    if (worker) return
    if (state === "failed" && Date.now() - failedAt < RETRY_AFTER_MS)
      throw new Error(lastError)
    state = "loading"
    lastError = ""
    worker = new Worker(join(opts.packageDir, "src/embed/needle-thread.cjs"), {
      workerData: {
        weightsUrl: NEEDLE_WEIGHTS_URL,
        weightsSha256: NEEDLE_WEIGHTS_SHA256,
        cacheDir: opts.cacheDir,
        enginePath: join(opts.packageDir, "src/vendor/needle.cjs"),
      },
    })
    // Never holds the process open while loading.
    worker.unref()
    worker.on(
      "message",
      (m: {
        type?: string
        id?: number
        error?: string
        vec?: Float32Array
      }) => {
        if (m.type === "ready") {
          state = "ready"
          return
        }
        if (m.type === "failed") return fail(m.error ?? "failed")
        const p = m.id === undefined ? undefined : pending.get(m.id)
        if (!p || m.id === undefined) return
        pending.delete(m.id)
        clearTimeout(p.timer)
        if (m.vec) p.resolve(m.vec)
        else p.reject(new Error(m.error ?? "embed failed"))
      },
    )
    worker.on("error", (e) => fail(e.message))
    worker.on("exit", (code) => {
      if (state !== "failed") fail(`worker exited ${code}`)
    })
  }
  const one = (text: string) =>
    new Promise<Float32Array>((resolve, reject) => {
      start()
      const id = nextId++
      const timer = setTimeout(() => {
        pending.delete(id)
        reject(new Error("embedding timed out"))
      }, TIMEOUT_MS)
      pending.set(id, { resolve, reject, timer })
      worker!.postMessage({ id, text: text.slice(0, MAX_EMBED_CHARS) })
    })
  return {
    model: NEEDLE_MODEL,
    async embed(texts) {
      const out: Float32Array[] = []
      for (const t of texts) out.push(await one(t))
      return out
    },
    async status() {
      return { state, detail: lastError || NEEDLE_MODEL }
    },
  }
}
