// Chat Admin as a custom element: <assistant-admin base="/assistant"></assistant-admin>
// It only talks to the module's JSON API, so any host can drop it in. Text always goes in through textContent.
;(() => {
  if (customElements.get("assistant-admin")) return

  const CSS = `
  :host { display: block; font-family: var(--bs-font-body, system-ui, sans-serif); color: var(--color-base-content, #0f172a); font-size: 14px; line-height: 1.5; }
  * { box-sizing: border-box; font-family: inherit; }
  h2 { font-size: 16px; margin: 0 0 4px; } h3 { font-size: 14px; margin: 14px 0 4px; }
  p { margin: 0 0 8px; } .sub { color: color-mix(in oklab, currentColor 65%, transparent); font-size: 13px; }
  .stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(130px, 1fr)); gap: 10px; margin-bottom: 12px; }
  .stat, .card { background: var(--color-base-100, #fff); border: 1px solid var(--color-base-300, #e2e8f0); border-radius: var(--radius-box, 10px); }
  .stat { padding: 12px; text-align: center; } .stat b { display: block; font-size: 22px; line-height: 1.2; } .stat span { font-size: 11px; text-transform: uppercase; letter-spacing: .04em; color: color-mix(in oklab, currentColor 65%, transparent); }
  .good { color: var(--color-success, #16a34a); } .warn { color: var(--color-warning, #b45309); } .bad { color: var(--color-error, #dc2626); }
  .tabs { display: flex; flex-wrap: wrap; gap: 2px; border-bottom: 1px solid var(--color-base-300, #e2e8f0); margin-bottom: 14px; }
  .tab { background: none; border: 0; border-bottom: 2px solid transparent; padding: 9px 12px; cursor: pointer; color: inherit; font-size: 13px; font-weight: 500; opacity: .75; }
  .tab[aria-selected="true"] { border-color: var(--color-primary, #4f46e5); opacity: 1; font-weight: 600; }
  .card { padding: 16px; margin-bottom: 12px; }
  .grid2 { display: grid; gap: 12px; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); align-items: start; }
  .row { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }
  .between { justify-content: space-between; }
  label.f { display: block; margin-top: 10px; font-weight: 500; font-size: 13px; }
  label.f small { display: block; font-weight: 400; color: color-mix(in oklab, currentColor 65%, transparent); }
  input[type=text], input[type=number], input[type=password], input[type=url], select, textarea { width: 100%; margin-top: 3px; padding: 7px 9px; border: 1px solid var(--color-base-300, #cbd5e1); border-radius: var(--radius-field, 6px); background: var(--color-base-100, #fff); color: inherit; font-size: 13px; }
  textarea { min-height: 80px; resize: vertical; } .mono { font-family: ui-monospace, Menlo, monospace; font-size: 12px; }
  button.b { padding: 6px 12px; border-radius: var(--radius-field, 6px); border: 1px solid var(--color-base-300, #cbd5e1); background: var(--color-base-100, #fff); color: inherit; cursor: pointer; font-size: 13px; font-weight: 500; }
  button.p { background: var(--color-primary, #4f46e5); border-color: var(--color-primary, #4f46e5); color: var(--color-primary-content, #fff); }
  button.d { color: var(--color-error, #dc2626); } button:disabled { opacity: .55; cursor: default; }
  .sw { display: flex; gap: 10px; align-items: flex-start; padding: 8px 0; border-bottom: 1px solid var(--color-base-200, #f1f5f9); } .sw:last-child { border: 0; }
  .sw input { margin-top: 3px; width: 16px; height: 16px; accent-color: var(--color-primary, #4f46e5); flex: none; } .sw b { display: block; font-weight: 500; }
  table { width: 100%; border-collapse: collapse; font-size: 13px; } th, td { text-align: left; padding: 7px 8px; border-bottom: 1px solid var(--color-base-200, #f1f5f9); vertical-align: top; }
  th { font-size: 11px; text-transform: uppercase; letter-spacing: .04em; color: color-mix(in oklab, currentColor 65%, transparent); }
  .scroll { overflow-x: auto; } .badge { display: inline-block; font-size: 11px; padding: 0 7px; border-radius: 999px; background: var(--color-base-200, #f1f5f9); }
  pre { background: var(--color-base-200, #f1f5f9); padding: 10px; border-radius: 6px; overflow: auto; white-space: pre-wrap; overflow-wrap: anywhere; font-family: ui-monospace, Menlo, monospace; font-size: 12px; margin: 6px 0; max-height: 380px; }
  .msg { padding: 8px 12px; border-radius: 6px; margin-bottom: 10px; font-size: 13px; background: var(--color-base-200, #f1f5f9); } .msg.err { color: var(--color-error, #dc2626); }
  .bar { height: 8px; border-radius: 4px; background: var(--color-primary, #4f46e5); }`

  const el = (tag, props = {}, ...kids) => {
    const n = document.createElement(tag)
    for (const [k, v] of Object.entries(props)) {
      if (k === "class") n.className = v
      else if (k === "value") n.value = v ?? ""
      else if (k === "checked" || k === "disabled" || k === "selected")
        n[k] = !!v
      else if (k.startsWith("on")) n.addEventListener(k.slice(2), v)
      else if (v !== undefined && v !== null) n.setAttribute(k, v)
    }
    for (const c of kids.flat())
      if (c !== null && c !== undefined && c !== false) n.append(c)
    return n
  }
  const present = (...kids) =>
    kids.filter((k) => k !== null && k !== undefined && k !== false)
  const AUDIENCES = [
    ["public", "Everyone"],
    ["user", "Signed-in users"],
    ["admin", "Admins only"],
  ]
  const TABS = [
    ["knowledge", "Knowledge"],
    ["aibase", "AI base"],
    ["welcome", "Welcome & small talk"],
    ["models", "Model settings"],
    ["add", "Add content"],
    ["mcp", "Tools & MCP"],
    ["rules", "Rules"],
    ["try", "Try it"],
    ["visitors", "Visitors"],
    ["logs", "Chat logs"],
    ["insights", "Insights"],
    ["console", "Console"],
  ]

  class AssistantAdmin extends HTMLElement {
    connectedCallback() {
      this.base = this.getAttribute("base") || "/assistant"
      this.root = this.attachShadow({ mode: "open" })
      this.tab = new URLSearchParams(location.search).get("tab") || "knowledge"
      this.note = null
      this.load()
    }
    async api(path, method = "GET", body) {
      const headers = {}
      if (body !== undefined) headers["content-type"] = "application/json"
      const token =
        this.getAttribute("token-key") &&
        sessionStorage.getItem(this.getAttribute("token-key"))
      if (token) headers.authorization = `Bearer ${token}`
      const res = await fetch(`${this.base}/admin${path}`, {
        method,
        headers,
        credentials: "same-origin",
        body: body === undefined ? undefined : JSON.stringify(body),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok)
        throw new Error(data.error || `The server answered ${res.status}`)
      return data
    }
    say(text, isError = false) {
      this.note = { text, isError }
      this.render()
    }
    /** Runs an action, shows its outcome and reloads. Every button goes through here, so errors are never silent. */
    async act(fn, ok) {
      try {
        const r = await fn()
        await this.load(false)
        if (ok) this.say(typeof ok === "function" ? ok(r) : ok)
        return r
      } catch (e) {
        this.say(e.message, true)
        return null
      }
    }
    async load(draw = true) {
      try {
        this.o = await this.api("/overview")
      } catch (e) {
        this.note = { text: e.message, isError: true }
      }
      if (draw) this.render()
    }
    render() {
      const s = this.o && this.o.settings
      const top = el("style", {}, CSS)
      const body = [top]
      if (this.o) {
        const c = this.o.counts
        const sources = this.o.sources
        const liveProviders = s.providers.filter((p) => p.enabled).length
        const tools = this.o.connections.reduce(
          (n, x) =>
            n + (x.enabled ? x.tools.filter((t) => t.enabled).length : 0),
          0,
        )
        const stats = [
          ["Sources", sources.length],
          ["Searchable passages", c.passages],
          [
            this.o.engine.model
              ? "Embedded (Needle 3)".replace(
                  "Needle 3",
                  this.o.engine.model.startsWith("needle")
                    ? "Needle 3"
                    : "Workers AI",
                )
              : "Semantic search",
            this.o.engine.model ? `${c.embedded}/${c.passages}` : "Off",
            this.o.engine.model && c.embedded === c.passages ? "good" : "warn",
          ],
          ["Model providers", liveProviders, liveProviders ? "" : "warn"],
          ["MCP tools on", tools],
          ["Chat", s.enabled ? "On" : "Off", s.enabled ? "good" : "warn"],
        ]
        body.push(
          el(
            "div",
            { class: "stats" },
            stats.map(([l, v, tone]) =>
              el(
                "div",
                { class: "stat" },
                el("b", { class: tone || "" }, String(v)),
                el("span", {}, l),
              ),
            ),
          ),
        )
        body.push(this.accessCard(s))
      }
      if (this.note)
        body.push(
          el(
            "div",
            {
              class: `msg ${this.note.isError ? "err" : ""}`,
              role: this.note.isError ? "alert" : "status",
            },
            this.note.text,
          ),
        )
      body.push(
        el(
          "div",
          { class: "tabs", role: "tablist" },
          TABS.map(([id, label]) =>
            el(
              "button",
              {
                class: "tab",
                role: "tab",
                "aria-selected": String(this.tab === id),
                onclick: () => this.setTab(id),
              },
              label,
            ),
          ),
        ),
      )
      const pane = el("div", { role: "tabpanel" })
      body.push(pane)
      this.root.replaceChildren(...body)
      if (this.o) this[`tab_${this.tab}`](pane, s)
    }
    setTab(id) {
      this.tab = id
      this.note = null
      const u = new URL(location.href)
      u.searchParams.set("tab", id)
      history.replaceState(history.state, "", u)
      this.render()
    }
    sw(label, help, checked, onchange) {
      return el(
        "label",
        { class: "sw" },
        el("input", {
          type: "checkbox",
          checked,
          onchange: (e) => onchange(e.target.checked),
        }),
        el(
          "span",
          {},
          el("b", {}, label),
          help ? el("span", { class: "sub" }, help) : null,
        ),
      )
    }
    save(patch, ok = "Saved") {
      return this.act(() => this.api("/settings", "POST", patch), ok)
    }
    accessCard(s) {
      return el(
        "div",
        { class: "card" },
        el("h2", {}, "Who can use the chat"),
        this.sw(
          "Chat is on",
          "Off hides the chat for everyone. Admins can still test it under Try it.",
          s.enabled,
          (v) => this.save({ enabled: v }),
        ),
        this.sw(
          "Visitors who are not signed in",
          "Only sees content marked for everyone.",
          s.allowPublic,
          (v) => this.save({ allowPublic: v }),
        ),
        this.sw("Signed-in users", null, s.allowUsers, (v) =>
          this.save({ allowUsers: v }),
        ),
      )
    }

    tab_knowledge(p, s) {
      const list = el("div", { class: "scroll" })
      const rows = this.o.sources.map((src) =>
        el(
          "tr",
          {},
          el(
            "td",
            {},
            el("b", {}, src.title),
            el(
              "div",
              { class: "sub" },
              `${src.kind}${src.origin ? ` - ${src.origin}` : ""}`,
            ),
          ),
          el("td", {}, `${src.embedded}/${src.chunks}`),
          el(
            "td",
            {},
            el(
              "select",
              {
                "aria-label": "Who can read this",
                onchange: (e) =>
                  this.act(
                    () =>
                      this.api(
                        `/sources/${encodeURIComponent(src.id)}`,
                        "PATCH",
                        { enabled: src.enabled, audience: e.target.value },
                      ),
                    "Saved",
                  ),
              },
              AUDIENCES.map(([v, l]) =>
                el("option", { value: v, selected: src.audience === v }, l),
              ),
            ),
          ),
          el(
            "td",
            {},
            el("input", {
              type: "checkbox",
              "aria-label": "In use",
              checked: src.enabled,
              onchange: (e) =>
                this.act(
                  () =>
                    this.api(
                      `/sources/${encodeURIComponent(src.id)}`,
                      "PATCH",
                      { enabled: e.target.checked },
                    ),
                  "Saved",
                ),
            }),
          ),
          el(
            "td",
            {},
            el(
              "div",
              { class: "row" },
              el(
                "button",
                { class: "b", onclick: () => this.showChunks(src, viewer) },
                "Passages",
              ),
              el(
                "button",
                {
                  class: "b d",
                  onclick: () =>
                    this.act(
                      () =>
                        this.api(
                          `/sources/${encodeURIComponent(src.id)}`,
                          "DELETE",
                        ),
                      "Deleted",
                    ),
                },
                "Delete",
              ),
            ),
          ),
        ),
      )
      const viewer = el("div", {})
      list.append(
        rows.length
          ? el(
              "table",
              {},
              el(
                "thead",
                {},
                el(
                  "tr",
                  {},
                  ["Source", "Embedded", "Who can read", "In use", ""].map(
                    (h) => el("th", {}, h),
                  ),
                ),
              ),
              el("tbody", {}, rows),
            )
          : el(
              "p",
              { class: "sub" },
              "Nothing yet. Add your first content under Add content.",
            ),
      )
      const e = this.o.engine
      p.append(
        el(
          "div",
          { class: "card" },
          el(
            "div",
            { class: "row between" },
            el(
              "div",
              {},
              el("h2", {}, "What the assistant knows"),
              el(
                "p",
                { class: "sub" },
                e.model
                  ? `Search: ${e.model}, ${e.state}${e.detail && e.state === "failed" ? ` (${e.detail})` : ""}. Until passages are embedded, search uses keywords.`
                  : "Semantic search is off. Search uses keywords.",
              ),
            ),
            el(
              "div",
              { class: "row" },
              this.o.canImport
                ? el(
                    "button",
                    {
                      class: "b",
                      onclick: () =>
                        this.act(
                          () => this.api("/import", "POST", {}),
                          (r) =>
                            `Checked ${r.imported} from this site: ${r.changed} updated, ${r.removed} removed. Run Embed next.`,
                        ),
                    },
                    "Import site content",
                  )
                : null,
              el(
                "button",
                {
                  class: "b p",
                  disabled:
                    !e.model ||
                    this.o.counts.embedded === this.o.counts.passages,
                  onclick: (ev) => this.embedAll(ev.target),
                },
                "Embed new passages",
              ),
            ),
          ),
          list,
          viewer,
        ),
      )
      void s
    }
    async embedAll(btn) {
      btn.disabled = true
      try {
        for (let i = 0; i < 2000; i++) {
          const r = await this.api("/embed", "POST", {})
          if (r.error) throw new Error(r.error)
          btn.textContent = `${r.remaining} left...`
          if (!r.remaining || !r.done) break
        }
        await this.load(false)
        this.say("Embedding finished.")
      } catch (e) {
        await this.load(false)
        this.say(
          `Embedding stopped: ${e.message}. Search still works on keywords.`,
          true,
        )
      }
    }
    async showChunks(src, viewer) {
      try {
        const { chunks } = await this.api(
          `/sources/${encodeURIComponent(src.id)}/chunks`,
        )
        viewer.replaceChildren(
          el("h3", {}, src.title),
          ...chunks.map((c) =>
            el("pre", {}, `${c.heading ? `${c.heading}\n` : ""}${c.text}`),
          ),
        )
      } catch (e) {
        this.say(e.message, true)
      }
    }

    tab_aibase(p, s) {
      const name = el("input", {
        type: "text",
        value: s.assistantName,
        maxlength: "60",
      })
      const persona = el("textarea", {
        value: s.persona,
        maxlength: "4000",
        rows: "6",
      })
      const honesty = el("textarea", {
        value: s.honestyReply,
        maxlength: "500",
        rows: "2",
      })
      const hl = el("input", {
        type: "text",
        value: s.handoffLabel,
        maxlength: "60",
      })
      const hu = el("input", {
        type: "text",
        value: s.handoffUrl,
        maxlength: "300",
        placeholder: "/contact_us",
      })
      const preview = el("div", {})
      p.append(
        el(
          "div",
          { class: "grid2" },
          el(
            "div",
            { class: "card" },
            el("h2", {}, "Instructions every AI call carries"),
            el("label", { class: "f" }, "Name shown in the chat", name),
            el(
              "p",
              { class: "sub" },
              "Opening lines are under Welcome & small talk.",
            ),
            el(
              "label",
              { class: "f" },
              "Persona",
              el(
                "small",
                {},
                "Who it is and how it talks. Fixed safety rules are added after this and always win.",
              ),
              persona,
            ),
            el(
              "label",
              { class: "f" },
              "Honesty reply",
              el("small", {}, "Used whenever it does not know."),
              honesty,
            ),
            el("label", { class: "f" }, "Hand-off link text", hl),
            el(
              "label",
              { class: "f" },
              "Hand-off link",
              el(
                "small",
                {},
                "Shown under the chat, such as your contact page. Empty hides it.",
              ),
              hu,
            ),
            el(
              "div",
              { class: "row", style: "margin-top:12px" },
              el(
                "button",
                {
                  class: "b p",
                  onclick: () =>
                    this.save({
                      assistantName: name.value,
                      persona: persona.value,
                      honestyReply: honesty.value,
                      handoffLabel: hl.value,
                      handoffUrl: hu.value,
                    }),
                },
                "Save",
              ),
            ),
          ),
          el(
            "div",
            { class: "card" },
            el("h2", {}, "What the model actually receives"),
            el(
              "p",
              { class: "sub" },
              "The full instructions as they stand, with the rules, tool guidance and matching passages.",
            ),
            el(
              "button",
              {
                class: "b",
                onclick: async () => {
                  try {
                    const r = await this.api("/prompt", "POST", {
                      question: "",
                      role: "admin",
                    })
                    preview.replaceChildren(
                      el("pre", {}, r.system),
                      el(
                        "p",
                        { class: "sub" },
                        `Tools offered: ${r.tools.join(", ") || "none"}`,
                      ),
                    )
                  } catch (e) {
                    this.say(e.message, true)
                  }
                },
              },
              "Show",
            ),
            preview,
          ),
        ),
      )
    }

    tab_welcome(p, s) {
      const area = (value, rows = 3, max = 3000) =>
        el("textarea", { rows: String(rows), maxlength: String(max), value })
      const greeting = area(s.greeting, 3, 1000)
      const named = area(s.welcomeNamed, 3, 1000)
      const back = area(s.welcomeBack, 3, 1000)
      const followups = area(s.honestyFollowups, 3, 1500)
      const topics = el("input", {
        type: "text",
        maxlength: "300",
        value: s.topics,
        placeholder: "Built from your content",
      })
      const field = (label, help, control) =>
        el("label", { class: "f" }, label, el("small", {}, help), control)
      const st = s.smallTalk
      const rows = el("div", {})
      let kinds = st.kinds.map((k) => ({ ...k }))
      const saveKinds = () =>
        this.save({ smallTalk: { ...st, kinds: kinds.map((k) => ({ ...k })) } })
      const draw = () => {
        rows.replaceChildren(
          ...kinds.map((k, i) => {
            const bind = (key, rowsN) => {
              const a = area(k[key], rowsN)
              a.addEventListener("input", () => (k[key] = a.value))
              return a
            }
            const label = el("input", {
              type: "text",
              maxlength: "60",
              value: k.label,
            })
            label.addEventListener("input", () => (k.label = label.value))
            return el(
              "details",
              {
                style:
                  "border-top:1px solid var(--color-base-300,#e2e8f0);padding:10px 0",
              },
              el(
                "summary",
                { style: "cursor:pointer;font-weight:500" },
                `${k.label}${k.enabled ? "" : " (off)"}`,
              ),
              this.sw("On", "", k.enabled, (v) => {
                k.enabled = v
              }),
              el("label", { class: "f" }, "Name", label),
              el(
                "div",
                { class: "grid2" },
                field(
                  "When the whole message is",
                  "One per line. A phrase, or /regex/ for variations. Longer messages with a real question go to search.",
                  bind("patterns", 6),
                ),
                field(
                  "First reply",
                  "One per line. One is picked at random.",
                  bind("replies", 6),
                ),
              ),
              field(
                "If they repeat it",
                "One per line, in order. Each repeat moves further along, so the tone can change from friendly to checking in.",
                bind("repeats", 4),
              ),
              el(
                "div",
                { class: "row", style: "margin-top:8px" },
                el(
                  "button",
                  {
                    class: "b d",
                    onclick: () => {
                      kinds.splice(i, 1)
                      draw()
                    },
                  },
                  "Remove",
                ),
              ),
            )
          }),
        )
      }
      draw()
      p.append(
        el(
          "div",
          { class: "card" },
          el("h2", {}, "Welcome messages"),
          el(
            "p",
            { class: "sub" },
            "What the chat says when it opens. Write one per line and one is picked each time. {name} is the visitor's first name.",
          ),
          field(
            "New visitor, name not known",
            "Used when you do not ask for details.",
            greeting,
          ),
          field(
            "Name known",
            "After the details form, or for a signed-in user.",
            named,
          ),
          field(
            "Returning visitor",
            "They have chatted before. Their earlier chat is shown above it.",
            back,
          ),
          field(
            "When it still cannot answer",
            'Used instead of your "do not know" reply when that was just said. {topics} lists some of your content.',
            followups,
          ),
          field(
            "Topics to offer",
            "What {topics} says, such as: our services, pricing and booking. Empty builds it from your content.",
            topics,
          ),
          el(
            "div",
            { class: "row", style: "margin-top:12px" },
            el(
              "button",
              {
                class: "b p",
                onclick: () =>
                  this.save({
                    greeting: greeting.value,
                    welcomeNamed: named.value,
                    welcomeBack: back.value,
                    honestyFollowups: followups.value,
                    topics: topics.value,
                  }),
              },
              "Save welcome messages",
            ),
          ),
        ),
        el(
          "div",
          { class: "card" },
          el("h2", {}, "Small talk"),
          el(
            "p",
            { class: "sub" },
            "Messages like hello or are you there, which are about the conversation and not your content. The reply follows what has already been said, so someone saying hello three times gets three different answers. Use {name}, {assistant} and {topics}.",
          ),
          this.sw(
            "Answer small talk",
            "Off sends these messages to search like any other.",
            st.enabled,
            (v) => this.save({ smallTalk: { ...st, enabled: v } }),
          ),
          this.sw(
            "Let the AI model word the reply",
            "It reads the conversation and uses your line as a guide. With no model, or if it fails, your lines are used as written.",
            st.useModel,
            (v) => this.save({ smallTalk: { ...st, useModel: v } }),
          ),
          rows,
          el(
            "div",
            { class: "row", style: "margin-top:12px" },
            el(
              "button",
              { class: "b p", onclick: saveKinds },
              "Save small talk",
            ),
            el(
              "button",
              {
                class: "b",
                onclick: () => {
                  kinds.push({
                    id: `custom-${Date.now()}`,
                    label: "New kind",
                    enabled: true,
                    patterns: "",
                    replies: "",
                    repeats: "",
                  })
                  draw()
                },
              },
              "Add a kind",
            ),
          ),
        ),
      )
    }

    tab_models(p, s) {
      const types = this.o.providerTypes
      const out = el("div", {})
      const move = (i, d) => {
        const ids = s.providers.map((x) => x.id)
        const j = i + d
        if (j < 0 || j >= ids.length) return
        ;[ids[i], ids[j]] = [ids[j], ids[i]]
        this.act(
          () => this.api("/providers/order", "POST", { ids }),
          "Order saved",
        )
      }
      p.append(
        el(
          "div",
          { class: "card" },
          el("h2", {}, "Providers, tried in this order"),
          el(
            "p",
            { class: "sub" },
            "If one hits a quota, an outage or a bad key, the next takes over. Three failures in a row rests a provider for five minutes.",
          ),
          s.providers.length
            ? el(
                "div",
                { class: "scroll" },
                el(
                  "table",
                  {},
                  el(
                    "thead",
                    {},
                    el(
                      "tr",
                      {},
                      ["#", "Provider", "Model", "Key", "Today", "On", ""].map(
                        (h) => el("th", {}, h),
                      ),
                    ),
                  ),
                  el(
                    "tbody",
                    {},
                    s.providers.map((pr, i) => {
                      const t = pr.today
                      return el(
                        "tr",
                        {},
                        el("td", {}, String(i + 1)),
                        el(
                          "td",
                          {},
                          el("b", {}, pr.id),
                          el(
                            "div",
                            { class: "sub" },
                            (types.find((x) => x.type === pr.type) || {})
                              .label || pr.type,
                          ),
                        ),
                        el("td", { class: "mono" }, pr.model),
                        el(
                          "td",
                          {},
                          pr.keySet
                            ? el("span", { class: "good" }, "Set")
                            : (types.find((x) => x.type === pr.type) || {})
                                  .needsKey
                              ? el("span", { class: "bad" }, "Missing")
                              : "Not needed",
                        ),
                        el(
                          "td",
                          {},
                          t
                            ? `${t.ok} ok, ${t.fail} failed, ${t.tokensIn + t.tokensOut} tokens`
                            : "-",
                          t && t.lastError
                            ? el(
                                "div",
                                { class: "sub bad" },
                                t.lastError.slice(0, 120),
                              )
                            : null,
                        ),
                        el(
                          "td",
                          {},
                          el("input", {
                            type: "checkbox",
                            "aria-label": "On",
                            checked: pr.enabled,
                            onchange: (e) =>
                              this.act(
                                () =>
                                  this.api("/providers", "POST", {
                                    id: pr.id,
                                    type: pr.type,
                                    model: pr.model,
                                    accountId: pr.accountId,
                                    baseUrl: pr.baseUrl,
                                    enabled: e.target.checked,
                                  }),
                                "Saved",
                              ),
                          }),
                        ),
                        el(
                          "td",
                          {},
                          el(
                            "div",
                            { class: "row" },
                            el(
                              "button",
                              {
                                class: "b",
                                "aria-label": "Move up",
                                onclick: () => move(i, -1),
                              },
                              "Up",
                            ),
                            el(
                              "button",
                              {
                                class: "b",
                                "aria-label": "Move down",
                                onclick: () => move(i, 1),
                              },
                              "Down",
                            ),
                            el(
                              "button",
                              {
                                class: "b",
                                onclick: async () => {
                                  try {
                                    const r = await this.api(
                                      `/providers/${pr.id}/test`,
                                      "POST",
                                      {},
                                    )
                                    this.say(`${pr.id}: ${r.detail}`, !r.ok)
                                  } catch (e) {
                                    this.say(e.message, true)
                                  }
                                },
                              },
                              "Test",
                            ),
                            el(
                              "button",
                              {
                                class: "b",
                                onclick: () => this.editProvider(out, pr),
                              },
                              "Edit",
                            ),
                            el(
                              "button",
                              {
                                class: "b d",
                                onclick: () =>
                                  this.act(
                                    () =>
                                      this.api(`/providers/${pr.id}`, "DELETE"),
                                    "Removed",
                                  ),
                              },
                              "Remove",
                            ),
                          ),
                        ),
                      )
                    }),
                  ),
                ),
              )
            : el(
                "p",
                { class: "sub" },
                "No providers yet, so answers can only quote your content word for word.",
              ),
        ),
        out,
      )
      this.editProvider(out, null)
      const budget = el("input", {
        type: "number",
        min: "0",
        value: String(s.dailyTokenBudget),
      })
      const maxT = el("input", {
        type: "number",
        min: "100",
        max: "16000",
        value: String(s.maxTokens),
      })
      p.append(
        el(
          "div",
          { class: "card" },
          el("h2", {}, "Limits"),
          el(
            "label",
            { class: "f" },
            "Daily token budget",
            el(
              "small",
              {},
              "Past this, answers quote passages until tomorrow. 0 means no limit.",
            ),
            budget,
          ),
          el("label", { class: "f" }, "Longest reply, in tokens", maxT),
          el(
            "div",
            { class: "row", style: "margin-top:12px" },
            el(
              "button",
              {
                class: "b p",
                onclick: () =>
                  this.save({
                    dailyTokenBudget: Number(budget.value),
                    maxTokens: Number(maxT.value),
                  }),
              },
              "Save limits",
            ),
          ),
        ),
      )
    }
    editProvider(out, pr) {
      const types = this.o.providerTypes
      const type = el(
        "select",
        { disabled: !!pr },
        types.map((t) =>
          el(
            "option",
            {
              value: t.type,
              selected: pr ? pr.type === t.type : t.type === "cloudflare",
            },
            t.label,
          ),
        ),
      )
      const model = el("input", {
        type: "text",
        value: pr ? pr.model : "",
        class: "mono",
      })
      const key = el("input", {
        type: "password",
        autocomplete: "new-password",
        placeholder: pr && pr.keySet ? "Saved. Leave empty to keep it." : "",
      })
      const account = el("input", {
        type: "text",
        value: pr ? pr.accountId : "",
      })
      const baseUrl = el("input", {
        type: "text",
        value: pr ? pr.baseUrl : "",
        class: "mono",
        placeholder: "http://localhost:11434/v1",
      })
      const hint = el("span", { class: "sub" })
      const fAccount = el(
        "label",
        { class: "f" },
        "Cloudflare account ID",
        el(
          "small",
          {},
          "Leave empty when this runs on Cloudflare with the Workers AI binding.",
        ),
        account,
      )
      const fBase = el("label", { class: "f" }, "Base URL", baseUrl)
      const refresh = (first) => {
        const t = types.find((x) => x.type === type.value)
        if (!first || !pr) model.value = pr && first ? pr.model : t.model
        model.placeholder = t.model ? "" : "Type the model name"
        fAccount.style.display = t.type === "cloudflare" ? "" : "none"
        fBase.style.display = t.type === "custom" ? "" : "none"
        hint.replaceChildren(
          t.keysUrl
            ? el(
                "a",
                {
                  href: t.keysUrl,
                  target: "_blank",
                  rel: "noopener noreferrer",
                },
                "Get a key",
              )
            : "",
        )
      }
      type.addEventListener("change", () => refresh(false))
      out.replaceChildren(
        el(
          "div",
          { class: "card" },
          el("h2", {}, pr ? `Edit ${pr.id}` : "Add a provider"),
          el(
            "div",
            { class: "grid2" },
            el("label", { class: "f" }, "Provider", type),
            el("label", { class: "f" }, "Model", model),
          ),
          el(
            "label",
            { class: "f" },
            "API key",
            el("small", {}, "Stored encrypted and never shown again."),
            key,
          ),
          hint,
          fAccount,
          fBase,
          el(
            "div",
            { class: "row", style: "margin-top:12px" },
            el(
              "button",
              {
                class: "b p",
                onclick: () =>
                  this.act(
                    () =>
                      this.api("/providers", "POST", {
                        id: pr ? pr.id : undefined,
                        type: type.value,
                        model: model.value,
                        accountId: account.value,
                        baseUrl: baseUrl.value,
                        enabled: pr ? pr.enabled : true,
                        key: key.value || undefined,
                      }),
                    pr ? "Saved" : "Provider added. Use Test to check it.",
                  ),
              },
              pr ? "Save" : "Add provider",
            ),
            pr
              ? el(
                  "button",
                  { class: "b", onclick: () => this.editProvider(out, null) },
                  "Cancel",
                )
              : null,
          ),
        ),
      )
      refresh(true)
    }

    tab_add(p) {
      const title = el("input", { type: "text", maxlength: "200" })
      const text = el("textarea", {
        rows: "12",
        placeholder: "Paste text or Markdown. Headings split it into passages.",
      })
      const origin = el("input", {
        type: "text",
        maxlength: "500",
        placeholder: "/pricing or https://...",
      })
      const aud = el(
        "select",
        {},
        AUDIENCES.map(([v, l]) => el("option", { value: v }, l)),
      )
      const file = el("input", {
        type: "file",
        accept: ".txt,.md,.markdown,.csv,text/plain,text/markdown",
        onchange: async (e) => {
          const f = e.target.files[0]
          if (!f) return
          if (f.size > 200000)
            return this.say(
              "That file is over 200 KB. Split it into smaller parts.",
              true,
            )
          text.value = await f.text()
          if (!title.value) title.value = f.name.replace(/\.[^.]+$/, "")
        },
      })
      p.append(
        el(
          "div",
          { class: "card" },
          el("h2", {}, "Add content"),
          el(
            "p",
            { class: "sub" },
            "Anything the assistant should know: FAQs, policies, price lists. Text and Markdown files work. PDF and Word are not supported yet, so paste their text.",
          ),
          el("label", { class: "f" }, "Title", title),
          el("label", { class: "f" }, "From a file", file),
          el("label", { class: "f" }, "Text", text),
          el(
            "label",
            { class: "f" },
            "Link to the original",
            el("small", {}, "Optional. Answers cite it."),
            origin,
          ),
          el("label", { class: "f" }, "Who can read this", aud),
          el(
            "div",
            { class: "row", style: "margin-top:12px" },
            el(
              "button",
              {
                class: "b p",
                onclick: () =>
                  this.act(
                    () =>
                      this.api("/sources", "POST", {
                        title: title.value,
                        text: text.value,
                        origin: origin.value || null,
                        audience: aud.value,
                      }),
                    (r) =>
                      `Added ${r.chunks} passages. Embed them under Knowledge for meaning-based search.`,
                  ),
              },
              "Add",
            ),
          ),
        ),
      )
    }

    tab_mcp(p) {
      const form = el("div", {})
      p.append(
        el(
          "div",
          { class: "card" },
          el("h2", {}, "MCP connections"),
          el(
            "p",
            { class: "sub" },
            "Let the assistant use tools on other services. Tools a server marks read-only start on. Anything that can change data stays off until you allow it.",
          ),
          this.o.connections.length
            ? null
            : el("p", { class: "sub" }, "No connections yet."),
        ),
      )
      for (const c of this.o.connections) {
        const results = el("div", {})
        p.append(
          el(
            "div",
            { class: "card" },
            el(
              "div",
              { class: "row between" },
              el(
                "div",
                {},
                el(
                  "h2",
                  {},
                  c.name,
                  " ",
                  el(
                    "span",
                    {
                      class: `badge ${c.lastError ? "bad" : c.lastOkAt ? "good" : ""}`,
                    },
                    c.lastError
                      ? "Error"
                      : c.lastOkAt
                        ? "Connected"
                        : "Not checked",
                  ),
                ),
                el("div", { class: "sub mono" }, c.url),
                c.lastError
                  ? el("div", { class: "sub bad" }, c.lastError)
                  : null,
              ),
              el(
                "div",
                { class: "row" },
                el(
                  "label",
                  { class: "row" },
                  el("input", {
                    type: "checkbox",
                    checked: c.enabled,
                    onchange: (e) =>
                      this.act(
                        () =>
                          this.api("/mcp", "POST", {
                            id: c.id,
                            name: c.name,
                            url: c.url,
                            enabled: e.target.checked,
                            instructions: c.instructions,
                            audience: c.audience,
                            timeoutMs: c.timeoutMs,
                          }),
                        "Saved",
                      ),
                  }),
                  "On",
                ),
                el(
                  "button",
                  {
                    class: "b",
                    onclick: () =>
                      this.act(
                        () => this.api(`/mcp/${c.id}/refresh`, "POST", {}),
                        (r) =>
                          r.ok ? `Found ${r.tools.length} tools.` : r.error,
                      ),
                  },
                  "Refresh tools",
                ),
                el(
                  "button",
                  { class: "b", onclick: () => this.editMcp(form, c) },
                  "Edit",
                ),
                el(
                  "button",
                  {
                    class: "b d",
                    onclick: () =>
                      this.act(
                        () => this.api(`/mcp/${c.id}`, "DELETE"),
                        "Removed",
                      ),
                  },
                  "Remove",
                ),
              ),
            ),
            c.tools.length
              ? el(
                  "div",
                  { class: "scroll" },
                  el(
                    "table",
                    {},
                    el(
                      "thead",
                      {},
                      el(
                        "tr",
                        {},
                        ["On", "Tool", "Kind", ""].map((h) => el("th", {}, h)),
                      ),
                    ),
                    el(
                      "tbody",
                      {},
                      c.tools.map((t) =>
                        el(
                          "tr",
                          {},
                          el(
                            "td",
                            {},
                            el("input", {
                              type: "checkbox",
                              "aria-label": `Allow ${t.name}`,
                              checked: t.enabled,
                              onchange: (e) =>
                                this.act(
                                  () =>
                                    this.api(`/mcp/${c.id}/tools`, "POST", {
                                      tool: t.name,
                                      enabled: e.target.checked,
                                    }),
                                  "Saved",
                                ),
                            }),
                          ),
                          el(
                            "td",
                            {},
                            el("b", { class: "mono" }, t.name),
                            el("div", { class: "sub" }, t.description),
                          ),
                          el(
                            "td",
                            {},
                            t.readOnly
                              ? el("span", { class: "badge good" }, "Read-only")
                              : el(
                                  "span",
                                  { class: "badge warn" },
                                  "May change data",
                                ),
                          ),
                          el(
                            "td",
                            {},
                            el(
                              "button",
                              {
                                class: "b",
                                onclick: () => this.tryTool(c, t, results),
                              },
                              "Try",
                            ),
                          ),
                        ),
                      ),
                    ),
                  ),
                )
              : el("p", { class: "sub" }, "No tools listed yet."),
            results,
          ),
        )
      }
      p.append(form)
      this.editMcp(form, null)
    }
    tryTool(c, t, results) {
      const args = el("textarea", { class: "mono", rows: "4", value: "{}" })
      const out = el("div", {})
      results.replaceChildren(
        el("h3", {}, `Try ${t.name}`),
        el("pre", {}, JSON.stringify(t.inputSchema, null, 2)),
        el("label", { class: "f" }, "Arguments as JSON", args),
        el(
          "div",
          { class: "row", style: "margin-top:8px" },
          el(
            "button",
            {
              class: "b p",
              onclick: async () => {
                let parsed
                try {
                  parsed = JSON.parse(args.value || "{}")
                } catch {
                  return out.replaceChildren(
                    el("p", { class: "bad" }, "That is not valid JSON."),
                  )
                }
                try {
                  const r = await this.api(`/mcp/${c.id}/call`, "POST", {
                    tool: t.name,
                    args: parsed,
                  })
                  out.replaceChildren(el("pre", {}, r.text))
                } catch (e) {
                  out.replaceChildren(el("p", { class: "bad" }, e.message))
                }
              },
            },
            "Run",
          ),
        ),
        out,
      )
    }
    editMcp(form, c) {
      const name = el("input", {
        type: "text",
        value: c ? c.name : "",
        maxlength: "60",
      })
      const url = el("input", {
        type: "url",
        class: "mono",
        value: c ? c.url : "",
        placeholder: "https://example.com/mcp",
      })
      const headers = el("textarea", {
        class: "mono",
        rows: "2",
        placeholder: c
          ? "Saved values are kept. Type here to replace them."
          : "Authorization: Bearer your-token",
      })
      const ins = el("textarea", {
        rows: "4",
        value: c ? c.instructions : "",
        maxlength: "3000",
        placeholder:
          "When to use these tools and how to phrase what they return.",
      })
      const aud = el(
        "select",
        {},
        AUDIENCES.map(([v, l]) =>
          el(
            "option",
            { value: v, selected: c ? c.audience === v : v === "user" },
            l,
          ),
        ),
      )
      const to = el("input", {
        type: "number",
        min: "1000",
        max: "60000",
        value: String(c ? c.timeoutMs : 10000),
      })
      form.replaceChildren(
        el(
          "div",
          { class: "card" },
          el("h2", {}, c ? `Edit ${c.name}` : "Add a connection"),
          el(
            "div",
            { class: "grid2" },
            el("label", { class: "f" }, "Name", name),
            el(
              "label",
              { class: "f" },
              "Server URL",
              el("small", {}, "Streamable HTTP endpoint."),
              url,
            ),
          ),
          el(
            "label",
            { class: "f" },
            "Headers",
            el(
              "small",
              {},
              "One per line. Stored encrypted and never shown again.",
            ),
            headers,
          ),
          el(
            "label",
            { class: "f" },
            "Rules for these tools",
            el(
              "small",
              {},
              "Added to the instructions whenever these tools are available.",
            ),
            ins,
          ),
          el(
            "div",
            { class: "grid2" },
            el("label", { class: "f" }, "Who may trigger these tools", aud),
            el("label", { class: "f" }, "Timeout (ms)", to),
          ),
          el(
            "div",
            { class: "row", style: "margin-top:12px" },
            el(
              "button",
              {
                class: "b p",
                onclick: () => {
                  const body = {
                    id: c ? c.id : undefined,
                    name: name.value,
                    url: url.value,
                    enabled: c ? c.enabled : true,
                    instructions: ins.value,
                    audience: aud.value,
                    timeoutMs: Number(to.value),
                  }
                  if (headers.value.trim() || !c) body.headers = headers.value
                  this.act(
                    () => this.api("/mcp", "POST", body),
                    (r) =>
                      r.ok
                        ? `Connected. Found ${r.tools.length} tools.`
                        : `Saved, but it could not connect: ${r.error}`,
                  )
                },
              },
              c ? "Save and connect" : "Add and connect",
            ),
            c
              ? el(
                  "button",
                  { class: "b", onclick: () => this.editMcp(form, null) },
                  "Cancel",
                )
              : null,
          ),
        ),
      )
    }

    tab_rules(p, s) {
      const rules = el("textarea", {
        rows: "6",
        maxlength: "3000",
        value: s.rules,
        placeholder:
          "Keep answers under 120 words.\nNever guess dates, fees or amounts.",
      })
      const blocked = el("textarea", {
        class: "mono",
        rows: "5",
        maxlength: "3000",
        value: s.blockedTopics,
        placeholder: "home address of\n/\\bssn\\b/",
      })
      const reply = el("input", {
        type: "text",
        maxlength: "400",
        value: s.blockedReply,
      })
      const n = (label, help, key, step, min, max) => {
        const i = el("input", {
          type: "number",
          step,
          min,
          max,
          value: String(s[key]),
        })
        i.dataset.key = key
        return el("label", { class: "f" }, label, el("small", {}, help), i)
      }
      const thresholds = el(
        "div",
        {},
        n(
          "Passages to the AI",
          "Top passages handed over (1-8).",
          "topK",
          "1",
          "1",
          "8",
        ),
        n(
          "Words that must match",
          "Off-topic questions usually match only one.",
          "minMatched",
          "1",
          "1",
          "6",
        ),
        n(
          "Share of the question",
          "Fraction of question words found.",
          "minCoverage",
          "0.05",
          "0",
          "1",
        ),
        n(
          "Lowest cosine",
          "Needle 3 veto below this.",
          "minCosine",
          "0.01",
          "-1",
          "1",
        ),
        n(
          "Needle 3 weight",
          "Ranking weight next to keywords.",
          "cosWeight",
          "0.05",
          "0",
          "2",
        ),
        n(
          "Meaning needed with one word",
          "Short questions pass with one matching word when the cosine reaches this.",
          "meaningCosine",
          "0.01",
          "-1",
          "1",
        ),
        n(
          "Tool steps per question",
          "How many rounds of tool calls.",
          "maxToolSteps",
          "1",
          "1",
          "8",
        ),
      )
      p.append(
        el(
          "div",
          { class: "grid2" },
          el(
            "div",
            {},
            el(
              "div",
              { class: "card" },
              el("h2", {}, "Rules for the AI"),
              el(
                "p",
                { class: "sub" },
                "Added to every AI call. They shape tone and scope; the honesty and safety rules always win.",
              ),
              rules,
            ),
            el(
              "div",
              { class: "card" },
              el("h2", {}, "Blocked topics"),
              el(
                "p",
                { class: "sub" },
                "A question matching any line gets the reply below instead of an answer. One per line: a word or phrase, or /regex/.",
              ),
              blocked,
              el(
                "label",
                { class: "f" },
                "Reply for a blocked topic",
                el("small", {}, "Empty uses the honesty reply."),
                reply,
              ),
            ),
            el(
              "button",
              {
                class: "b p",
                onclick: () => {
                  const patch = {
                    rules: rules.value,
                    blockedTopics: blocked.value,
                    blockedReply: reply.value,
                  }
                  for (const i of thresholds.querySelectorAll("input"))
                    patch[i.dataset.key] = Number(i.value)
                  this.save(patch, "Rules saved")
                },
              },
              "Save rules",
            ),
          ),
          el(
            "div",
            {},
            el(
              "div",
              { class: "card" },
              el("h2", {}, "Knowledge answers"),
              this.sw(
                "Answer from knowledge passages",
                "Search your added content.",
                s.usePassages,
                (v) => this.save({ usePassages: v }),
              ),
              this.sw(
                "Let the AI word answers",
                "Off quotes the closest passage instead, only on a strong match.",
                s.aiWording,
                (v) => this.save({ aiWording: v }),
              ),
              this.sw(
                "Allow general knowledge",
                "Off keeps every answer to your content and tools.",
                s.allowGeneral,
                (v) => this.save({ allowGeneral: v }),
              ),
              el(
                "label",
                { class: "f" },
                "Meaning-based search",
                el("small", {}, "Changing engine needs a new Embed run."),
                el(
                  "select",
                  {
                    onchange: (e) =>
                      this.save({ embeddingEngine: e.target.value }),
                  },
                  [
                    ["needle", "Needle 3"],
                    ["workers-ai", "Cloudflare Workers AI"],
                    ["off", "Off, keywords only"],
                  ].map(([v, l]) =>
                    el(
                      "option",
                      { value: v, selected: s.embeddingEngine === v },
                      l,
                    ),
                  ),
                ),
              ),
            ),
            el(
              "div",
              { class: "card" },
              el("h2", {}, "Thresholds"),
              el(
                "p",
                { class: "sub" },
                "The defaults come from the evaluated TamilSchool assistant. Check Try it after changing them.",
              ),
              thresholds,
            ),
          ),
        ),
      )
    }

    tab_try(p) {
      const q = el("input", {
        type: "text",
        placeholder: "Ask what your visitors would ask",
        maxlength: "2000",
      })
      const role = el(
        "select",
        {},
        AUDIENCES.map(([v, l]) => el("option", { value: v }, `As: ${l}`)),
      )
      const out = el("div", {})
      const history = []
      const run = async () => {
        if (!q.value.trim()) return
        out.replaceChildren(el("p", { class: "sub" }, "Working..."))
        try {
          const found = await this.api("/test-search", "POST", {
            question: q.value,
            role: role.value,
          })
          const res = await fetch(`${this.base}/chat`, {
            method: "POST",
            credentials: "same-origin",
            headers: {
              "content-type": "application/json",
              ...(this.getAttribute("token-key") &&
              sessionStorage.getItem(this.getAttribute("token-key"))
                ? {
                    authorization: `Bearer ${sessionStorage.getItem(this.getAttribute("token-key"))}`,
                  }
                : {}),
            },
            body: JSON.stringify({ message: q.value, debug: true, history }),
          })
          const reply = await res.json()
          if (!res.ok) throw new Error(reply.error || "Chat failed")
          history.push(
            { role: "user", content: q.value },
            { role: "assistant", content: reply.text },
          )
          out.replaceChildren(
            ...present(
              el("h3", {}, "Answer"),
              el("pre", {}, reply.text),
              el(
                "p",
                { class: "sub" },
                `Route: ${reply.route}. ${reply.provider ? `Model: ${reply.provider} (${reply.model}). ` : ""}${reply.toolsUsed.length ? `Tools: ${reply.toolsUsed.join(", ")}. ` : ""}${reply.debug ? reply.debug.why : ""}`,
              ),
              reply.debug && reply.debug.errors.length
                ? el("p", { class: "sub bad" }, reply.debug.errors.join("; "))
                : null,
              found.blocked
                ? el("p", { class: "sub bad" }, `Blocked by: ${found.blocked}`)
                : null,
              el(
                "h3",
                {},
                `Search (${found.why}${found.usedEmbedding ? ", with Needle 3" : ", keywords only"}${found.confident ? ", confident" : ", not confident"})`,
              ),
              found.hits.length
                ? el(
                    "div",
                    { class: "scroll" },
                    el(
                      "table",
                      {},
                      el(
                        "thead",
                        {},
                        el(
                          "tr",
                          {},
                          [
                            "Passage",
                            "Score",
                            "Matched",
                            "Coverage",
                            "Cosine",
                          ].map((h) => el("th", {}, h)),
                        ),
                      ),
                      el(
                        "tbody",
                        {},
                        found.hits.map((h) =>
                          el(
                            "tr",
                            {},
                            el(
                              "td",
                              {},
                              el("b", {}, h.title),
                              el("div", { class: "sub" }, h.text.slice(0, 180)),
                            ),
                            el("td", {}, String(h.score)),
                            el("td", {}, String(h.matched)),
                            el("td", {}, String(h.coverage)),
                            el("td", {}, String(h.cos)),
                          ),
                        ),
                      ),
                    ),
                  )
                : el("p", { class: "sub" }, "No passages."),
            ),
          )
        } catch (e) {
          out.replaceChildren(el("p", { class: "bad" }, e.message))
        }
      }
      q.addEventListener("keydown", (e) => {
        if (e.key === "Enter") run()
      })
      p.append(
        el(
          "div",
          { class: "card" },
          el("h2", {}, "Try a question"),
          el(
            "p",
            { class: "sub" },
            "Runs the real chat, even while it is off, and shows how it decided. Tries are logged. Who can read is applied to the search table.",
          ),
          el(
            "div",
            { class: "row", style: "margin-top:8px" },
            el("span", { style: "flex:1;min-width:220px" }, q),
            el("span", {}, role),
            el("button", { class: "b p", onclick: run }, "Ask"),
          ),
          out,
        ),
      )
    }

    tab_visitors(p, s) {
      const f = s.visitorForm
      const mode = (label, key, help) =>
        el(
          "label",
          { class: "f" },
          label,
          help ? el("small", {}, help) : null,
          el(
            "select",
            {
              onchange: (e) =>
                this.save({ visitorForm: { ...f, [key]: e.target.value } }),
            },
            [
              ["off", "Do not ask"],
              ["optional", "Optional"],
              ["required", "Required"],
            ].map(([v, l]) =>
              el("option", { value: v, selected: f[key] === v }, l),
            ),
          ),
        )
      const intro = el("textarea", {
        rows: "2",
        maxlength: "300",
        value: f.intro,
      })
      const notice = el("textarea", {
        rows: "3",
        maxlength: "500",
        value: f.notice,
      })
      const q = el("input", {
        type: "text",
        placeholder: "Search name, email or phone",
        style: "width:240px",
      })
      const list = el("div", { class: "scroll" })
      const detail = el("div", {})
      const showHistory = async (v) => {
        try {
          const { logs } = await this.api(`/visitors/${v.id}`)
          detail.replaceChildren(
            el("h3", {}, `Conversation with ${v.name || "this visitor"}`),
            ...(logs.length
              ? [...logs]
                  .reverse()
                  .flatMap((l) => [
                    el(
                      "p",
                      { class: "sub" },
                      `${new Date(l.created_at).toLocaleString()}${l.page ? ` on ${l.page}` : ""}`,
                    ),
                    el("p", {}, el("b", {}, l.question)),
                    el("p", {}, l.answer),
                  ])
              : [el("p", { class: "sub" }, "No messages yet.")]),
          )
        } catch (e) {
          this.say(e.message, true)
        }
      }
      const deleteButton = (v) => {
        const b = el("button", { class: "b d" }, "Delete")
        b.addEventListener("click", async () => {
          if (b.dataset.armed !== "1") {
            b.dataset.armed = "1"
            b.textContent = "Delete this person and their chats?"
            return
          }
          await this.act(
            () => this.api(`/visitors/${v.id}`, "DELETE"),
            "Deleted",
          )
          detail.replaceChildren()
          load()
        })
        return b
      }
      const load = async () => {
        try {
          const { visitors } = await this.api(
            `/visitors?${new URLSearchParams(q.value ? { q: q.value } : {})}`,
          )
          list.replaceChildren(
            visitors.length
              ? el(
                  "table",
                  {},
                  el(
                    "thead",
                    {},
                    el(
                      "tr",
                      {},
                      [
                        "Who",
                        "Contact",
                        "Location",
                        "Last page",
                        "Chats",
                        "Last seen",
                        "",
                      ].map((h) => el("th", {}, h)),
                    ),
                  ),
                  el(
                    "tbody",
                    {},
                    visitors.map((v) =>
                      el(
                        "tr",
                        {},
                        el("td", {}, v.name || "No name"),
                        el(
                          "td",
                          {},
                          v.email
                            ? el(
                                "div",
                                {},
                                el("a", { href: `mailto:${v.email}` }, v.email),
                              )
                            : null,
                          v.phone
                            ? el(
                                "div",
                                {},
                                el("a", { href: `tel:${v.phone}` }, v.phone),
                              )
                            : null,
                        ),
                        el(
                          "td",
                          {},
                          v.typedLocation ||
                            [v.city, v.region, v.country]
                              .filter(Boolean)
                              .join(", ") ||
                            "Not known",
                          v.timezone
                            ? el("div", { class: "sub" }, v.timezone)
                            : null,
                          v.latitude
                            ? el(
                                "div",
                                {},
                                el(
                                  "a",
                                  {
                                    href: `https://www.openstreetmap.org/?mlat=${v.latitude}&mlon=${v.longitude}`,
                                    target: "_blank",
                                    rel: "noopener noreferrer",
                                  },
                                  "Exact position",
                                ),
                              )
                            : null,
                        ),
                        el("td", { class: "mono" }, v.lastPage || "-"),
                        el("td", {}, String(v.chats)),
                        el("td", {}, new Date(v.lastSeen).toLocaleString()),
                        el(
                          "td",
                          {},
                          el(
                            "div",
                            { class: "row" },
                            el(
                              "button",
                              { class: "b", onclick: () => showHistory(v) },
                              "History",
                            ),
                            deleteButton(v),
                          ),
                        ),
                      ),
                    ),
                  ),
                )
              : el("p", { class: "sub" }, "Nobody yet."),
          )
        } catch (e) {
          list.replaceChildren(el("p", { class: "bad" }, e.message))
        }
      }
      q.addEventListener("keydown", (e) => {
        if (e.key === "Enter") load()
      })
      p.append(
        el(
          "div",
          { class: "card" },
          el("h2", {}, "Details asked before the first message"),
          el(
            "p",
            { class: "sub" },
            "Signed-in users are never asked. A returning visitor is recognised by a cookie in their browser.",
          ),
          this.sw(
            "Ask visitors for their details",
            "Off lets anyone chat straight away, without being remembered.",
            f.enabled,
            (v) => this.save({ visitorForm: { ...f, enabled: v } }),
          ),
          el(
            "div",
            { class: "grid2" },
            mode("Name", "name"),
            mode("Email", "email"),
            mode("Phone", "phone"),
            mode(
              "Where they are",
              "location",
              "Asks them to type it. Approximate location is recorded anyway where your host provides it.",
            ),
          ),
          this.sw(
            "Need an email or a phone",
            "Whichever they prefer, when both are shown.",
            f.emailOrPhone,
            (v) => this.save({ visitorForm: { ...f, emailOrPhone: v } }),
          ),
          this.sw(
            "Offer to share exact location",
            "Shows a button, and the browser then asks their permission. Most sites do not need this.",
            f.preciseLocation,
            (v) => this.save({ visitorForm: { ...f, preciseLocation: v } }),
          ),
          el("label", { class: "f" }, "Text above the form", intro),
          el(
            "label",
            { class: "f" },
            "Privacy note under the form",
            el(
              "small",
              {},
              "Say what you keep. Your privacy page should match.",
            ),
            notice,
          ),
          el(
            "div",
            { class: "row", style: "margin-top:12px" },
            el(
              "button",
              {
                class: "b p",
                onclick: () =>
                  this.save({
                    visitorForm: {
                      ...f,
                      intro: intro.value,
                      notice: notice.value,
                    },
                  }),
              },
              "Save wording",
            ),
          ),
        ),
        el(
          "div",
          { class: "card" },
          el(
            "div",
            { class: "row between" },
            el("h2", {}, "Visitors"),
            el(
              "div",
              { class: "row" },
              q,
              el("button", { class: "b", onclick: load }, "Search"),
            ),
          ),
          list,
          detail,
        ),
      )
      load()
    }

    async tab_logs(p) {
      const q = el("input", {
        type: "text",
        placeholder: "Search questions and answers",
      })
      const route = el(
        "select",
        {},
        [
          "",
          "ai",
          "tools",
          "quote",
          "smalltalk",
          "honesty",
          "blocked",
          "guarded",
        ].map((r) => el("option", { value: r }, r || "All routes")),
      )
      const out = el("div", { class: "scroll" })
      const load = async () => {
        try {
          const u = new URLSearchParams()
          if (q.value) u.set("q", q.value)
          if (route.value) u.set("route", route.value)
          const { logs } = await this.api(`/logs?${u}`)
          out.replaceChildren(
            logs.length
              ? el(
                  "table",
                  {},
                  el(
                    "thead",
                    {},
                    el(
                      "tr",
                      {},
                      [
                        "When",
                        "Who",
                        "Where",
                        "Question",
                        "Answer",
                        "Route",
                        "Model",
                        "ms",
                        "",
                      ].map((h) => el("th", {}, h)),
                    ),
                  ),
                  el(
                    "tbody",
                    {},
                    logs.map((l) =>
                      el(
                        "tr",
                        {},
                        el("td", {}, new Date(l.created_at).toLocaleString()),
                        el("td", {}, l.who || l.role),
                        el(
                          "td",
                          {},
                          l.page ? el("div", { class: "mono" }, l.page) : "-",
                          l.location
                            ? el("div", { class: "sub" }, l.location)
                            : null,
                        ),
                        el("td", {}, l.question),
                        el(
                          "td",
                          {},
                          String(l.answer).slice(0, 220),
                          l.error
                            ? el(
                                "div",
                                { class: "sub bad" },
                                String(l.error).slice(0, 200),
                              )
                            : null,
                        ),
                        el("td", {}, el("span", { class: "badge" }, l.route)),
                        el("td", {}, l.provider || "-"),
                        el("td", {}, String(l.ms)),
                        el(
                          "td",
                          {},
                          l.rating === 1
                            ? "Helpful"
                            : l.rating === -1
                              ? "Not helpful"
                              : "",
                        ),
                      ),
                    ),
                  ),
                )
              : el("p", { class: "sub" }, "No conversations yet."),
          )
        } catch (e) {
          out.replaceChildren(el("p", { class: "bad" }, e.message))
        }
      }
      route.addEventListener("change", load)
      q.addEventListener("keydown", (e) => {
        if (e.key === "Enter") load()
      })
      p.append(
        el(
          "div",
          { class: "card" },
          el("h2", {}, "Chat logs"),
          el(
            "div",
            { class: "row" },
            el("span", { style: "flex:1;min-width:200px" }, q),
            el("span", {}, route),
            el("button", { class: "b", onclick: load }, "Search"),
          ),
          out,
        ),
      )
      load()
    }

    async tab_insights(p) {
      const card = el(
        "div",
        { class: "card" },
        el("p", { class: "sub" }, "Loading..."),
      )
      p.append(card)
      try {
        const d = await this.api("/insights?days=30")
        const total = d.routes.reduce((n, r) => n + r.n, 0)
        const peak = Math.max(1, ...d.perDay.map((x) => x.n))
        const LABEL = {
          ai: "AI answer",
          tools: "AI with tools",
          quote: "Quoted passage",
          honesty: "Did not know",
          smalltalk: "Small talk",
          blocked: "Blocked topic",
          guarded: "Guard refused",
        }
        card.replaceChildren(
          el("h2", {}, "Last 30 days"),
          el(
            "p",
            { class: "sub" },
            `${total} questions. Rated helpful ${d.ratings.up}, not helpful ${d.ratings.down}.`,
          ),
          el("h3", {}, "How questions were answered"),
          el(
            "table",
            {},
            el(
              "tbody",
              {},
              d.routes.map((r) =>
                el(
                  "tr",
                  {},
                  el("td", {}, LABEL[r.route] || r.route),
                  el("td", {}, String(r.n)),
                  el(
                    "td",
                    { style: "width:50%" },
                    el("div", {
                      class: "bar",
                      style: `width:${Math.round((r.n / (total || 1)) * 100)}%`,
                    }),
                  ),
                  el("td", {}, `${r.avgMs} ms avg`),
                ),
              ),
            ),
          ),
          el("h3", {}, "Questions per day"),
          el(
            "table",
            {},
            el(
              "tbody",
              {},
              d.perDay.map((x) =>
                el(
                  "tr",
                  {},
                  el("td", { style: "white-space:nowrap" }, x.day),
                  el("td", {}, String(x.n)),
                  el(
                    "td",
                    { style: "width:60%" },
                    el("div", {
                      class: "bar",
                      style: `width:${Math.round((x.n / peak) * 100)}%`,
                    }),
                  ),
                  el("td", {}, `${x.tokens} tokens`),
                ),
              ),
            ),
          ),
          el("h3", {}, "Pages people ask from"),
          d.pages.length
            ? el(
                "table",
                {},
                el(
                  "tbody",
                  {},
                  d.pages.map((x) =>
                    el(
                      "tr",
                      {},
                      el("td", { class: "mono" }, x.page),
                      el("td", {}, String(x.n)),
                    ),
                  ),
                ),
              )
            : el("p", { class: "sub" }, "Nothing yet."),
          el("h3", {}, "Most asked and not answered"),
          el("p", { class: "sub" }, "The best list of what to add next."),
          d.unanswered.length
            ? el(
                "table",
                {},
                el(
                  "tbody",
                  {},
                  d.unanswered.map((u) =>
                    el(
                      "tr",
                      {},
                      el("td", {}, u.question),
                      el("td", {}, String(u.n)),
                    ),
                  ),
                ),
              )
            : el("p", { class: "sub" }, "Nothing yet."),
        )
      } catch (e) {
        card.replaceChildren(el("p", { class: "bad" }, e.message))
      }
    }

    tab_console(p) {
      const out = el("pre", {}, "Type: chat help")
      const cmd = el("input", {
        type: "text",
        class: "mono",
        placeholder: "chat status",
      })
      const run = async () => {
        if (!cmd.value.trim()) return
        try {
          const r = await this.api("/console", "POST", { command: cmd.value })
          out.textContent = `> ${cmd.value}\n${r.output}`
          cmd.value = ""
          this.o = await this.api("/overview")
        } catch (e) {
          out.textContent = e.message
        }
      }
      cmd.addEventListener("keydown", (e) => {
        if (e.key === "Enter") run()
      })
      p.append(
        el(
          "div",
          { class: "card" },
          el("h2", {}, "Console"),
          el(
            "p",
            { class: "sub" },
            "The same controls as text commands. Every command is recorded.",
          ),
          el(
            "div",
            { class: "row" },
            el("span", { style: "flex:1;min-width:220px" }, cmd),
            el("button", { class: "b p", onclick: run }, "Run"),
          ),
          out,
        ),
      )
    }
  }
  customElements.define("assistant-admin", AssistantAdmin)
})()
