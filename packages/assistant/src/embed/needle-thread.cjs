// Needle on Node, in a worker thread: the wasm model is process-global and a long passage takes over a second.
// Weights are fetched once from the pinned revision, checked against their SHA-256 and cached on disk.
const { parentPort, workerData } = require("worker_threads")
const fs = require("fs")
const path = require("path")
const crypto = require("crypto")

const { weightsUrl, weightsSha256, cacheDir, enginePath } = workerData
const sha256 = (file) =>
  crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex")

async function ensureWeights() {
  const file = path.join(cacheDir, `needle3-${weightsSha256.slice(0, 12)}.cact`)
  if (fs.existsSync(file) && sha256(file) === weightsSha256) return file
  fs.mkdirSync(cacheDir, { recursive: true })
  const res = await fetch(weightsUrl)
  if (!res.ok) throw new Error(`weights download failed: HTTP ${res.status}`)
  const buf = Buffer.from(await res.arrayBuffer())
  const got = crypto.createHash("sha256").update(buf).digest("hex")
  if (got !== weightsSha256)
    throw new Error(`weights sha256 mismatch: ${got.slice(0, 12)}`)
  // A temp name first, so a half-written file can never be taken for a cached one.
  const tmp = `${file}.${process.pid}.tmp`
  fs.writeFileSync(tmp, buf)
  fs.renameSync(tmp, file)
  return file
}

let M = null
let dim = 0
let out = 0

const ready = (async () => {
  const file = await ensureWeights()
  const createNeedle = require(enginePath)
  const mod = await createNeedle()
  const cact = fs.readFileSync(file)
  const p = mod._malloc(cact.length)
  mod.HEAPU8.set(cact, p)
  if (mod._needle_load(p, BigInt(cact.length)) < 0)
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
  dim = mod.ccall(
    "needle_embed",
    "number",
    ["string", "number", "number"],
    ["x", 0, 0],
  )
  out = mod._malloc(dim * 4)
  M = mod
  parentPort.postMessage({ type: "ready", dim })
})().catch((e) =>
  parentPort.postMessage({
    type: "failed",
    error: String((e && e.message) || e),
  }),
)

parentPort.on("message", ({ id, text }) => {
  ready.then(() => {
    if (!M) return parentPort.postMessage({ id, error: "engine not loaded" })
    try {
      const n = M.ccall(
        "needle_embed",
        "number",
        ["string", "number", "number"],
        [String(text), out, dim],
      )
      if (n <= 0) throw new Error("needle_embed failed")
      const vec = Float32Array.from(new Float32Array(M.HEAPU8.buffer, out, n))
      parentPort.postMessage({ id, vec }, [vec.buffer])
    } catch (e) {
      parentPort.postMessage({ id, error: String((e && e.message) || e) })
    }
  })
})
