// The Needle Worker's handler: its own isolate, so hitting the memory limit can only ever cost keyword-only
// search for a moment, never the chat. Weights live in R2 because Workers assets stop at 25 MiB.
import createNeedle from "../vendor/needle.worker.mjs"
import { bootNeedle, NEEDLE_MODEL } from "./needle-core"

type Env = {
  WEIGHTS: {
    get(
      key: string,
    ): Promise<{ body: ReadableStream<Uint8Array>; size: number } | null>
  }
}

const MAX_TEXTS = 32

export const createNeedleHandler = (wasmModule: WebAssembly.Module) => {
  let embed: ((t: string) => Float32Array) | null = null
  let booting: Promise<void> | null = null
  let lastError = ""
  const boot = (env: Env) =>
    (booting ??= (async () => {
      const object = await env.WEIGHTS.get("needle3.cact")
      if (!object) throw new Error("needle3.cact is not in the R2 bucket")
      const mod = await createNeedle({ wasmModule })
      embed = await bootNeedle(mod, object.body, object.size)
    })().catch((e) => {
      booting = null
      lastError = e instanceof Error ? e.message : String(e)
      throw e
    }))

  return async (request: Request, env: Env): Promise<Response> => {
    const { pathname } = new URL(request.url)
    if (pathname === "/health") {
      return Response.json({
        state: embed ? "ready" : lastError ? "failed" : "idle",
        detail: lastError || NEEDLE_MODEL,
      })
    }
    if (pathname !== "/embed" || request.method !== "POST")
      return new Response("Not found", { status: 404 })
    const { texts } = (await request.json()) as { texts: string[] }
    if (!Array.isArray(texts) || texts.length > MAX_TEXTS)
      return new Response("Bad request", { status: 400 })
    try {
      await boot(env)
      return Response.json({
        vectors: texts.map((t) => Array.from(embed!(String(t)))),
      })
    } catch (e) {
      return Response.json(
        { error: e instanceof Error ? e.message : String(e) },
        { status: 503 },
      )
    }
  }
}
