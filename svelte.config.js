import adapter from "@sveltejs/adapter-auto"
import { vitePreprocess } from "@sveltejs/vite-plugin-svelte"

/** @type {import('@sveltejs/kit').Config} */
const config = {
  kit: {
    // adapter-auto picks Node, Vercel, Netlify or Cloudflare from the environment. SQLite needs a
    // persistent disk, so on serverless hosts set DATABASE_URL to Postgres. See README.
    adapter: adapter(),
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
        ],
        "base-uri": ["self"],
        "object-src": ["none"],
      },
    },
  },
  preprocess: vitePreprocess(),
}

export default config
