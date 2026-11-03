import adapter from "@sveltejs/adapter-auto"
import { vitePreprocess } from "@sveltejs/vite-plugin-svelte"
import { loadEnv } from "vite"

// Content Security Policy. SvelteKit adds hashes/nonces for its own inline scripts, so no 'unsafe-inline' for scripts.
// .env is not in process.env when this file loads, so read it the way Vite does (shell vars still win).
const env = loadEnv(
  process.env.NODE_ENV || "development",
  process.cwd(),
  "PUBLIC_",
)
const supabaseUrl = env.PUBLIC_SUPABASE_URL || ""
const supabaseOrigins = supabaseUrl.startsWith("http")
  ? [
      new URL(supabaseUrl).origin,
      new URL(supabaseUrl).origin.replace(/^http/, "ws"),
    ]
  : []

/** @type {import('@sveltejs/kit').Config} */
const config = {
  kit: {
    // adapter-auto only supports some environments, see https://kit.svelte.dev/docs/adapter-auto for a list.
    // If your environment is not supported or you settled on a specific environment, switch out the adapter.
    // See https://kit.svelte.dev/docs/adapters for more information about adapters.
    adapter: adapter(),
    // allow up to 150kb of style to be inlined with the HTML
    // Faster FCP (First Contentful Paint) by reducing the number of requests
    inlineStyleThreshold: 150000,
    csp: {
      mode: "auto",
      directives: {
        "default-src": ["self"],
        "script-src": ["self"],
        // Svelte transitions and the Supabase auth UI inject inline styles
        "style-src": ["self", "unsafe-inline"],
        "img-src": ["self", "data:", "https:", ...supabaseOrigins],
        "font-src": ["self", "data:"],
        "connect-src": [
          "self",
          "https://*.supabase.co",
          "wss://*.supabase.co",
          ...supabaseOrigins,
        ],
        "frame-src": ["https://calendly.com", "https://*.calendly.com"],
        "form-action": [
          "self",
          "https://checkout.stripe.com",
          "https://billing.stripe.com",
        ],
        "base-uri": ["self"],
        "object-src": ["none"],
      },
    },
  },
  preprocess: vitePreprocess(),
}

export default config
