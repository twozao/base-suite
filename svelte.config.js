import cloudflare from "@sveltejs/adapter-cloudflare"
import node from "@sveltejs/adapter-node"
import { vitePreprocess } from "@sveltejs/vite-plugin-svelte"

/** @type {import('@sveltejs/kit').Config} */
const config = {
  kit: {
    // Node by default (SQLite on disk, or Postgres). BUILD_TARGET=cloudflare builds a Worker that uses
    // D1 and R2; see docs/DEPLOY_CLOUDFLARE.md.
    adapter:
      process.env.BUILD_TARGET === "cloudflare"
        ? cloudflare({ config: "cloudflare/adapter.toml" })
        : node(),
    alias: { $assistant: "packages/assistant/src" },
    // allow up to 150kb of style to be inlined with the HTML for a faster first paint
    inlineStyleThreshold: 150000,
    // Content Security Policy. SvelteKit adds hashes for its own inline scripts, so no 'unsafe-inline' for scripts.
    csp: {
      mode: "auto",
      directives: {
        "default-src": ["self"],
        "script-src": ["self"],
        // Svelte transitions inject inline styles
        "style-src": ["self", "unsafe-inline"],
        // Editors paste image URLs from anywhere, so any https host is allowed for images only
        "img-src": ["self", "data:", "https:"],
        "font-src": ["self", "data:"],
        "connect-src": ["self"],
        "frame-src": ["https://calendly.com", "https://*.calendly.com"],
        "form-action": [
          "self",
          "https://checkout.stripe.com",
          "https://billing.stripe.com",
          // Connecting a sign-in provider posts here, then redirects to the provider
          "https://accounts.google.com",
          "https://github.com",
        ],
        "base-uri": ["self"],
        "object-src": ["none"],
      },
    },
  },
  preprocess: vitePreprocess(),
}

export default config
