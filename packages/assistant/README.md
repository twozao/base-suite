# Assistant

A chat assistant that answers from your own content, with an admin screen to manage everything. It has no framework or database dependency, so it can be lifted into any project.

- **Needle 3 search.** Keyword and meaning-based search over your passages, using a 34 MB open model (Apache-2.0) that runs on your own server. Search keeps working on keywords if the model is unavailable.
- **Any AI provider.** Cloudflare Workers AI, Anthropic, OpenAI, Gemini, Groq, OpenRouter, Cerebras, Mistral, or any OpenAI-compatible URL such as Ollama. Add several: if one fails, the next takes over.
- **MCP connections.** Point it at Model Context Protocol servers so it can use tools on other services, each with its own rules and access level.
- **Chat Admin.** Knowledge, AI base, Model settings, Add content, Tools & MCP, Rules, Try it, Welcome & small talk, Visitors, Chat logs, Insights and Console, with on and off controls throughout.

It also answers with no AI provider at all, by quoting a passage when the match is strong.

## How an answer is made

1. Is the chat on, and may this person use it?
2. Blocked topics and prompt injection checks. These answer without calling a model.
3. Search, filtered first by what this person may read.
4. Nothing to answer from: the honest reply, with no model call.
5. The model answers from the passages and any allowed tools, moving down the provider list on failure.
6. Secrets and any repeated instructions are removed from the reply, and it is logged.

## Safety decisions

- Text from passages and tools is treated as data, never as instructions.
- MCP tools a server marks read-only start on. Anything else stays off until an admin allows it. A model cannot call a tool that was not offered to this person.
- MCP connections cannot reach private or local addresses, or follow redirects.
- API keys and MCP headers are encrypted and are never returned by the API.
- Writes need JSON and the same origin, so another site cannot act for a signed-in admin.

## Welcome and small talk

Under Welcome & small talk, an admin sets several opening lines for new, named and returning visitors, and one is picked each time.

Hello, thanks, "are you there" and "what can you do" never reach search, because search can only fail on them. Each kind has its own patterns, first replies and replies for when it is repeated. Within 30 minutes, repeating a message moves further along the list and no line is said twice while an unused one is left, so someone testing with "hello" a few times gets a reply that notices. With a model connected, the model words the reply from the conversation, using the admin's line as a guide. Without one, or if it fails, the admin's line is used as written. Your "do not know" reply also changes when it was just said.

A message only counts as small talk when the whole of it matches, so "hello, what is the price" still gets an answer.

A host that passes `importSources` keeps its pages in the knowledge base by itself: they are checked at most every five minutes when someone chats, and only changed pages lose their embeddings. Switch it off with the `siteSync` setting.

## Knowing who is chatting

Before the first message a visitor is asked for the details you choose under Visitors: name, email, phone and where they are, each off, optional or required. Signed-in users are never asked. With the form off, visitors chat without being remembered.

- **Returning visitors.** A random token in an HttpOnly cookie, kept 180 days, brings their history back in that browser. Only its hash is stored. An email typed into the form never unlocks history, because anyone could type it.
- **Signed-in users.** Pass `id`, `name` and `email` from `authorize`, and their history follows them across devices.
- **Location.** Read from what the platform reports: `request.cf` on Cloudflare, otherwise the `cf-ip*`, `x-vercel-ip-*` and `x-appengine-*` headers. Browser time zone and language fill the gaps. Nothing is sent to an outside lookup service, and the address itself is not stored. With no such platform in front, as in local development, there is no city, and those headers could be faked, so treat location as a hint. Replace it with the `locate` option.
- **Exact position.** Off by default. When on, the chat shows a button and the browser asks permission.
- **Page.** Each message records the path it was sent from, without the query string or fragment, which can hold private tokens. Use `redactPage` to hide private paths too. A passage from the current page ranks a little higher, so "how much is this?" works.
- **What the model sees.** Name, approximate location, local time, language and page, marked as data. It never gets the email, phone or exact position. Earlier turns from the last 24 hours come from the server, so a browser cannot invent what the assistant said.
- **Deleting.** Admins can delete a person and their chats under Visitors. Visitors and logs older than the log retention setting are removed.

Tell people what you keep: the form shows a note you can edit, and your privacy page should match. Consent rules for location and tracking cookies vary by country, so check what applies to you. `onVisitor` lets the host pass new visitors to its CRM.

## Use it in another project

Give it a database driver and a way to say who is asking. `src/index.ts` is the whole API.

```ts
import { createAssistant, createHandler } from "@base-suite/assistant"

const assistant = createAssistant({
  db: yourDriver, // { all(sql, params), run(sql, params) } with ? placeholders
  secretKey: process.env.ASSISTANT_SECRET_KEY,
})

const handler = createHandler({
  assistant,
  basePath: "/assistant",
  assets: { adminJs, widgetJs }, // the text of src/ui/admin.js and src/ui/widget.js
  authorize: async (request) => ({ role: "public" }), // "public", "user" or "admin"
})
// Mount handler (Request to Response) at /assistant/*
```

Then add the front ends to your pages. Both are plain JavaScript and follow your CSS variables.

```html
<script src="/assistant/widget.js" data-base="/assistant" defer></script>

<assistant-admin base="/assistant"></assistant-admin>
<script src="/assistant/admin.js"></script>
```

If your site has its own live chat, add `data-handoff="Talk to a person"` to the widget script. The chat then shows that button, and clicking it closes the chat and fires an `assistant:handoff` event on `window`, with the visitor's last question in `detail.question`, so your page can open its live chat. When the assistant stays hidden for a visitor, it fires `assistant:unavailable`, so your page can show its own chat button instead.

Tables are created on first use, all prefixed `assistant_`. For Needle on Node use `needleNodeEngine` from `./embed/needle-node`. In Base Suite see `src/lib/server/assistant.ts`.

## Deploy to Cloudflare

This runs as two Workers on D1 and R2, with Workers AI available as a model.

```sh
cd packages/assistant/worker
curl -L -o needle3.cact "https://huggingface.co/Cactus-Compute/needle3/resolve/9da75122d4ca11aa4a667281c9c8ba38a7eed679/needle3.cact"
shasum -a 256 needle3.cact   # must be c9d915eca282ed42d1a09b143b592adb4cc6744ffe2d294adf5cfc5548170c38

wrangler r2 bucket create assistant-needle-weights
wrangler r2 object put assistant-needle-weights/needle3.cact --file needle3.cact --remote
(cd needle && wrangler deploy)

wrangler d1 create assistant        # put the id in chat/wrangler.toml
cd chat
wrangler secret put ASSISTANT_SECRET_KEY
wrangler secret put ADMIN_TOKEN
wrangler deploy
```

Open `/admin` on the chat Worker and sign in with `ADMIN_TOKEN`. Set `ALLOWED_ORIGINS` to embed the widget on other sites.

To run it locally, copy `.dev.vars.example` to `chat/.dev.vars`, upload the weights with `--local`, then:

```sh
cd chat && wrangler dev -c wrangler.toml -c ../needle/wrangler.toml --local
```

### What to know before relying on it

- **Needs the paid Workers plan.** The free plan allows 10 ms of CPU per request; a question takes about 30 to 90 ms to embed. Passages take longer, so they are embedded a few at a time.
- **Memory is the risk.** Needle's heap reaches about 102 MB against the 128 MB limit per Worker. That is why it has its own Worker and streams its weights into the heap. This has been run in Cloudflare's local runtime, which does not enforce the limit, so test it after your first deploy. If it fails, chat carries on with keywords, and you can switch Rules -> Meaning-based search to Cloudflare Workers AI.
- **Large content.** All passages are read into memory per Worker instance, at about 16 KB each once embedded. This suits thousands of passages. Far beyond that, move vectors to Cloudflare Vectorize.
- **Workers AI** only works once deployed, as there is no local version.

## Not included

Streaming replies, PDF and Word import (paste the text instead), MCP sign-in through OAuth (use a token header), a knowledge graph, and human approval of each tool call.

## Tests

From the Base Suite root: `npx vitest run packages/assistant`. Rebuild the Workers engine after replacing it with `node scripts/patch-needle.mjs`.
