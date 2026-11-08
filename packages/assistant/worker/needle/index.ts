import wasm from "../../src/vendor/needle.wasm"
import { createNeedleHandler } from "../../src/embed/needle-worker"

const handler = createNeedleHandler(wasm as unknown as WebAssembly.Module)
export default { fetch: handler }
