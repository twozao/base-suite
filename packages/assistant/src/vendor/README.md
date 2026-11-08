# Needle 3 engine

`needle.cjs` and `needle.wasm` are the WebAssembly build of cactus-needle 3.0.1 (Apache-2.0, Cactus Compute).
`needle.cjs` is unmodified and used on Node. `scripts/patch-needle.mjs` writes `needle.worker.mjs` from it for Cloudflare
Workers: Workers cannot compile wasm from bytes and expose `process`, so the patch takes a precompiled module and skips
environment detection. Rerun the script after replacing the engine.

Weights are not stored here. They are `needle3.cact` from Cactus-Compute/needle3 on Hugging Face, Apache-2.0, pinned by
revision and SHA-256 in `src/embed/needle-core.ts`.
