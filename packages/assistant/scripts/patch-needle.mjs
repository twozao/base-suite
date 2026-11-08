// Writes src/vendor/needle.worker.mjs from the stock engine. Fails loudly if a new engine build changes these lines.
import { readFileSync, writeFileSync } from "node:fs"

const dir = new URL("../src/vendor/", import.meta.url)
let src = readFileSync(new URL("needle.cjs", dir), "utf8")
const swap = (from, to) => {
  if (!(from instanceof RegExp ? from.test(src) : src.includes(from)))
    throw new Error(`engine changed, cannot find: ${from}`)
  src = src.replace(from, to)
}
swap(
  "var ENVIRONMENT_IS_WEB=!!globalThis.window;",
  "var ENVIRONMENT_IS_WEB=false;",
)
swap(
  "var ENVIRONMENT_IS_WORKER=!!globalThis.WorkerGlobalScope;",
  "var ENVIRONMENT_IS_WORKER=false;",
)
swap(/var ENVIRONMENT_IS_NODE=[^;]*;/, "var ENVIRONMENT_IS_NODE=false;")
swap(
  "var result=await instantiateAsync(wasmBinary,wasmBinaryFile,info);",
  'var result=Module["wasmModule"]?{instance:await WebAssembly.instantiate(Module["wasmModule"],info)}:await instantiateAsync(wasmBinary,wasmBinaryFile,info);',
)
swap(
  /if\(typeof exports==="object"&&typeof module==="object"\)\{[\s\S]*$/,
  "export default createNeedle;\n",
)
writeFileSync(new URL("needle.worker.mjs", dir), src)
