import adminJs from "../../src/ui/admin.js"
import widgetJs from "../../src/ui/widget.js"
import {
  createAssistant,
  createHandler,
  remoteEngine,
  workersAiEngine,
  type Who,
} from "../../src/index"
import { d1Driver } from "../../src/store/d1"

// Runs the module on its own: Workers AI as a model, D1 for storage, Needle in a second Worker.
type Env = {
  DB: Parameters<typeof d1Driver>[0]
  AI?: { run(model: string, input: unknown): Promise<unknown> }
  NEEDLE?: { fetch: typeof fetch }
  /** Encrypts stored API keys. `wrangler secret put ASSISTANT_SECRET_KEY` */
  ASSISTANT_SECRET_KEY: string
  /** The password for /admin. `wrangler secret put ADMIN_TOKEN` */
  ADMIN_TOKEN: string
  /** Sites allowed to embed the widget, comma separated. */
  ALLOWED_ORIGINS?: string
  ALLOW_PRIVATE_MCP?: string
}

const BASE = "/assistant"
const PAGE_CSS =
  "body{margin:0;font:14px system-ui;background:#f8fafc;color:#0f172a}main{max-width:1100px;margin:auto;padding:20px}"

const safeEqual = async (a: string, b: string) => {
  const hash = (s: string) =>
    crypto.subtle.digest("SHA-256", new TextEncoder().encode(s))
  const [x, y] = [new Uint8Array(await hash(a)), new Uint8Array(await hash(b))]
  return x.every((v, i) => v === y[i])
}

const page = (title: string, body: string) =>
  new Response(
    `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title><style>${PAGE_CSS}</style></head><body>${body}</body></html>`,
    {
      headers: {
        "content-type": "text/html; charset=utf-8",
        "content-security-policy":
          "default-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; object-src 'none'; base-uri 'self'; frame-ancestors 'none'",
        "x-content-type-options": "nosniff",
      },
    },
  )

const LOGIN_JS = `document.getElementById("f").addEventListener("submit",function(e){e.preventDefault();sessionStorage.setItem("assistant-admin-token",document.getElementById("t").value);location.href="/admin/app"})`

let cached: { handler: (r: Request) => Promise<Response> } | null = null

const build = (env: Env) => {
  const allowPrivateMcp = env.ALLOW_PRIVATE_MCP === "true"
  const assistant = createAssistant({
    db: d1Driver(env.DB),
    secretKey: env.ASSISTANT_SECRET_KEY,
    ai: env.AI ?? null,
    allowPrivateMcp,
    embedding: (s) => {
      if (s.embeddingEngine === "workers-ai")
        return env.AI ? workersAiEngine(env.AI) : null
      return env.NEEDLE ? remoteEngine(env.NEEDLE) : null
    },
  })
  return createHandler({
    assistant,
    basePath: BASE,
    allowPrivateMcp,
    assets: { adminJs, widgetJs },
    allowedOrigins: (env.ALLOWED_ORIGINS ?? "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean),
    authorize: async (request): Promise<Who> => {
      const token = (request.headers.get("authorization") ?? "").replace(
        /^Bearer\s+/i,
        "",
      )
      return env.ADMIN_TOKEN &&
        token &&
        (await safeEqual(token, env.ADMIN_TOKEN))
        ? { role: "admin", name: "admin" }
        : { role: "public" }
    },
  })
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (!env.ASSISTANT_SECRET_KEY || !env.ADMIN_TOKEN)
      return new Response("Set ASSISTANT_SECRET_KEY and ADMIN_TOKEN first.", {
        status: 500,
      })
    const { pathname } = new URL(request.url)
    cached ??= { handler: build(env) }
    if (pathname.startsWith(BASE)) return cached.handler(request)
    if (pathname === "/admin/login.js")
      return new Response(LOGIN_JS, {
        headers: { "content-type": "text/javascript" },
      })
    if (pathname === "/admin") {
      return page(
        "Sign in",
        `<main><h1>Chat Admin</h1><form id="f"><label>Admin token <input id="t" type="password" autocomplete="current-password" required></label> <button>Open</button></form></main><script src="/admin/login.js"></script>`,
      )
    }
    if (pathname === "/admin/app") {
      return page(
        "Chat Admin",
        `<main><assistant-admin base="${BASE}" token-key="assistant-admin-token"></assistant-admin></main><script src="${BASE}/admin.js"></script>`,
      )
    }
    if (pathname === "/") {
      return page(
        "Assistant",
        `<main><h1>Assistant</h1><p>The chat bubble is in the corner once it is switched on in <a href="/admin">Chat Admin</a>.</p></main><script src="${BASE}/widget.js" data-base="${BASE}"></script>`,
      )
    }
    return new Response("Not found", { status: 404 })
  },
}
