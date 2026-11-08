// The chat bubble. No framework and no inline script, so it drops into any site under a strict Content Security Policy.
// Usage: <script src="/assistant/widget.js" data-base="/assistant" defer></script>
;(() => {
  const script = document.currentScript
  const base = (script && script.dataset.base) || "/assistant"
  const offset = (script && script.dataset.offset) || "20px"
  // An embed on another site needs the cookie sent across origins; on the same site this changes nothing.
  const credentials =
    new URL(base, location.href).origin === location.origin
      ? "same-origin"
      : "include"

  const CSS = `
  :host { all: initial; font-family: var(--bs-font-body, system-ui, sans-serif); color: var(--color-base-content, #0f172a); }
  * { box-sizing: border-box; font-family: inherit; }
  .launch { position: fixed; right: ${offset}; bottom: 20px; width: 56px; height: 56px; border-radius: 50%; border: 0; cursor: pointer; z-index: 2147483000;
    background: var(--color-primary, #4f46e5); color: var(--color-primary-content, #fff); box-shadow: 0 6px 20px rgb(0 0 0 / .25); display: grid; place-items: center; }
  .panel { position: fixed; right: ${offset}; bottom: 88px; width: min(390px, calc(100vw - 32px)); height: min(600px, calc(100dvh - 120px)); z-index: 2147483000;
    display: flex; flex-direction: column; overflow: hidden; border-radius: var(--radius-box, 14px); border: 1px solid var(--color-base-300, #e2e8f0);
    background: var(--color-base-100, #fff); box-shadow: 0 12px 40px rgb(0 0 0 / .28); }
  .head { display: flex; align-items: center; justify-content: space-between; gap: 8px; padding: 12px 14px; background: var(--color-primary, #4f46e5); color: var(--color-primary-content, #fff); font-weight: 600; }
  .x { background: none; border: 0; color: inherit; cursor: pointer; font-size: 18px; padding: 2px 6px; }
  .log { flex: 1; overflow-y: auto; padding: 14px; display: flex; flex-direction: column; gap: 10px; font-size: 14px; line-height: 1.5; }
  .m { max-width: 86%; padding: 9px 12px; border-radius: 12px; white-space: pre-wrap; overflow-wrap: anywhere; }
  .u { align-self: flex-end; background: var(--color-primary, #4f46e5); color: var(--color-primary-content, #fff); }
  .a { align-self: flex-start; background: var(--color-base-200, #f1f5f9); }
  .meta { margin-top: 6px; font-size: 12px; opacity: .85; }
  .meta a { color: inherit; }
  .rate { margin-top: 6px; display: flex; gap: 8px; font-size: 12px; }
  .rate button { background: none; border: 1px solid var(--color-base-300, #cbd5e1); border-radius: 6px; color: inherit; cursor: pointer; padding: 1px 8px; font-size: 12px; }
  form.say { display: flex; gap: 8px; padding: 10px; border-top: 1px solid var(--color-base-300, #e2e8f0); }
  textarea { flex: 1; resize: none; height: 40px; max-height: 110px; padding: 9px 10px; border-radius: var(--radius-field, 8px); border: 1px solid var(--color-base-300, #cbd5e1);
    background: var(--color-base-100, #fff); color: inherit; font-size: 14px; }
  .send { border: 0; border-radius: var(--radius-field, 8px); padding: 0 14px; cursor: pointer; font-weight: 600; background: var(--color-primary, #4f46e5); color: var(--color-primary-content, #fff); }
  .send:disabled { opacity: .55; cursor: default; }
  .intro { margin: 0 0 12px; font-size: 14px; }
  .pre { flex: 1; overflow-y: auto; padding: 14px; display: block; border: 0; font-size: 14px; }
  .pre label { display: block; margin-bottom: 10px; font-weight: 500; font-size: 13px; }
  .pre input { display: block; width: 100%; margin-top: 3px; padding: 8px 10px; border-radius: var(--radius-field, 8px); border: 1px solid var(--color-base-300, #cbd5e1); background: var(--color-base-100, #fff); color: inherit; font-size: 14px; }
  .pre input[aria-invalid="true"] { border-color: var(--color-error, #dc2626); }
  .err { display: block; margin-top: 3px; font-weight: 400; font-size: 12px; color: var(--color-error, #dc2626); }
  .start { width: 100%; padding: 10px; margin-top: 4px; }
  .notice { margin: 10px 0 0; font-size: 11px; opacity: .75; line-height: 1.4; }
  .share { background: none; border: 1px solid var(--color-base-300, #cbd5e1); border-radius: 6px; color: inherit; cursor: pointer; padding: 3px 8px; font-size: 12px; align-self: flex-start; }
  .foot { padding: 0 12px 8px; font-size: 11px; opacity: .7; text-align: center; }
  .foot a { color: inherit; }
  .dots::after { content: "..."; animation: blink 1.2s infinite; }
  @keyframes blink { 50% { opacity: .3; } }
  @media (prefers-reduced-motion: reduce) { .dots::after { animation: none; } }`

  const el = (tag, props = {}, ...kids) => {
    const n = document.createElement(tag)
    for (const [k, v] of Object.entries(props)) {
      if (k === "class") n.className = v
      else if (k.startsWith("on")) n.addEventListener(k.slice(2), v)
      else if (v !== undefined && v !== null) n.setAttribute(k, v)
    }
    for (const c of kids) n.append(c)
    return n
  }
  const icon = () => {
    const s = document.createElementNS("http://www.w3.org/2000/svg", "svg")
    s.setAttribute("viewBox", "0 0 24 24")
    s.setAttribute("width", "26")
    s.setAttribute("height", "26")
    s.setAttribute("fill", "none")
    s.setAttribute("stroke", "currentColor")
    s.setAttribute("stroke-width", "1.8")
    s.setAttribute("stroke-linecap", "round")
    s.setAttribute("stroke-linejoin", "round")
    const p = document.createElementNS("http://www.w3.org/2000/svg", "path")
    p.setAttribute(
      "d",
      "M12 3l1.8 4.7 4.7 1.8-4.7 1.8L12 16l-1.8-4.7L5.500 9.500l4.7-1.8L12 3zm7 12l.9 2.1 2.1.9-2.1.9-.9 2.1-.9-2.1-2.1-.9 2.100-.9.9-2.1z",
    )
    s.append(p)
    return s
  }

  const start = async () => {
    let config
    try {
      const res = await fetch(`${base}/config`, { credentials })
      if (!res.ok) return
      config = await res.json()
    } catch {
      return
    }
    if (!config.available) return

    const host = el("div", { id: "assistant-widget" })
    const root = host.attachShadow({ mode: "open" })
    root.append(el("style", {}, CSS))
    document.body.append(host)

    const hints = () => ({
      page: location.href,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      language: navigator.language,
    })
    const conversation = crypto.randomUUID()
    // Someone the server does not know has no stored chat, so this page keeps the context for them.
    const past = []
    let panel = null
    let log, input, send

    const addRate = (bubble, id) => {
      const say = (rating, label) => async () => {
        row.replaceChildren(label)
        fetch(`${base}/rate`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ id, rating }),
        }).catch(() => null)
      }
      const row = el(
        "div",
        { class: "rate" },
        el(
          "button",
          {
            type: "button",
            "aria-label": "Helpful",
            onclick: say(1, "Thanks!"),
          },
          "Helpful",
        ),
        el(
          "button",
          {
            type: "button",
            "aria-label": "Not helpful",
            onclick: say(-1, "Thanks for telling us."),
          },
          "Not helpful",
        ),
      )
      bubble.append(row)
    }
    const bubble = (role, text, extra = {}) => {
      const b = el("div", { class: `m ${role === "user" ? "u" : "a"}` }, text)
      if (extra.sources && extra.sources.length) {
        const meta = el("div", { class: "meta" }, "Source: ")
        extra.sources.forEach((s, i) => {
          if (i) meta.append(", ")
          meta.append(s.url ? el("a", { href: s.url }, s.title) : s.title)
        })
        b.append(meta)
      }
      if (extra.logId) addRate(b, extra.logId)
      log.append(b)
      log.scrollTop = log.scrollHeight
      return b
    }
    const ask = async (text) => {
      bubble("user", text)
      const wait = el("div", {
        class: "m a dots",
        role: "status",
        "aria-label": "Thinking",
      })
      log.append(wait)
      log.scrollTop = log.scrollHeight
      send.disabled = true
      try {
        const res = await fetch(`${base}/chat`, {
          method: "POST",
          credentials,
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            message: text,
            conversation,
            ...hints(),
            ...(config.visitor ? {} : { history: past.slice(-10) }),
          }),
        })
        const data = await res.json().catch(() => ({}))
        wait.remove()
        if (!res.ok) {
          bubble(
            "assistant",
            data.error || "Something went wrong. Please try again.",
          )
          return
        }
        bubble("assistant", data.text, {
          sources: data.sources,
          // Nobody needs to rate a hello.
          logId: data.route === "smalltalk" ? null : data.logId,
        })
        past.push(
          { role: "user", content: text },
          { role: "assistant", content: data.text },
        )
      } catch {
        wait.remove()
        bubble("assistant", "I could not reach the server. Please try again.")
      } finally {
        send.disabled = false
        input.focus()
      }
    }
    const toggle = () => {
      if (panel) {
        panel.remove()
        panel = null
        launch.setAttribute("aria-expanded", "false")
        launch.focus()
        return
      }
      log = el("div", { class: "log", role: "log", "aria-live": "polite" })
      input = el("textarea", {
        "aria-label": "Your message",
        placeholder: "Ask a question...",
        maxlength: "2000",
        rows: "1",
      })
      send = el("button", { class: "send", type: "submit" }, "Send")
      input.addEventListener("keydown", (e) => {
        if (e.key === "Enter" && !e.shiftKey) {
          e.preventDefault()
          form.requestSubmit()
        }
      })
      const form = el(
        "form",
        {
          class: "say",
          onsubmit: (e) => {
            e.preventDefault()
            const text = input.value.trim()
            if (!text || send.disabled) return
            input.value = ""
            ask(text)
          },
        },
        input,
        send,
      )
      const head = el(
        "div",
        { class: "head" },
        el("span", {}, config.name),
        el(
          "button",
          {
            class: "x",
            type: "button",
            "aria-label": "Close",
            onclick: toggle,
          },
          "x",
        ),
      )
      panel = el(
        "div",
        { class: "panel", role: "dialog", "aria-label": config.name },
        head,
      )
      const foot = config.handoff
        ? el(
            "div",
            { class: "foot" },
            el("a", { href: config.handoff.url }, config.handoff.label),
          )
        : null
      const showChat = async () => {
        panel.replaceChildren(head, log, form, ...(foot ? [foot] : []))
        try {
          const res = await fetch(`${base}/history`, { credentials })
          const { history } = await res.json()
          for (const h of history || []) {
            bubble("user", h.question)
            bubble("assistant", h.answer)
          }
        } catch {
          /* the chat still works without its past */
        }
        bubble("assistant", config.greeting)
        if (config.preciseLocation && navigator.geolocation) {
          const share = el(
            "button",
            {
              class: "share",
              type: "button",
              onclick: () => {
                navigator.geolocation.getCurrentPosition(
                  (pos) => {
                    share.remove()
                    config.preciseLocation = false
                    fetch(`${base}/visitor/position`, {
                      method: "POST",
                      credentials,
                      headers: { "content-type": "application/json" },
                      body: JSON.stringify({
                        latitude: pos.coords.latitude,
                        longitude: pos.coords.longitude,
                      }),
                    }).catch(() => null)
                  },
                  () => share.remove(),
                )
              },
            },
            "Share my location",
          )
          log.append(share)
        }
        input.focus()
      }
      const showForm = () => {
        const f = config.form
        const errors = {}
        const field = (key, label, attrs, mode) => {
          if (mode === "off") return null
          const i = el("input", { name: key, ...attrs })
          const e = el("span", { class: "err", id: `err-${key}` })
          errors[key] = { i, e }
          i.setAttribute("aria-describedby", `err-${key}`)
          return el(
            "label",
            {},
            `${label}${mode === "required" ? " *" : ""}`,
            i,
            e,
          )
        }
        const start = el(
          "button",
          { class: "send start", type: "submit" },
          "Start chat",
        )
        const general = el("span", { class: "err", role: "alert" })
        const pre = el("form", {
          class: "pre",
          novalidate: "",
          onsubmit: async (ev) => {
            ev.preventDefault()
            start.disabled = true
            const data = Object.fromEntries(new FormData(pre).entries())
            try {
              const res = await fetch(`${base}/visitor`, {
                method: "POST",
                credentials,
                headers: { "content-type": "application/json" },
                body: JSON.stringify({ ...data, ...hints() }),
              })
              const out = await res.json().catch(() => ({}))
              for (const { i, e } of Object.values(errors)) {
                i.removeAttribute("aria-invalid")
                e.textContent = ""
              }
              general.textContent = ""
              if (res.ok) {
                config.visitor = out.visitor
                config.greeting = out.greeting || config.greeting
                config.form = null
                await showChat()
                return
              }
              if (out.errors) {
                let first = null
                for (const [k, msg] of Object.entries(out.errors)) {
                  if (!errors[k]) continue
                  errors[k].e.textContent = msg
                  errors[k].i.setAttribute("aria-invalid", "true")
                  first = first || errors[k].i
                }
                if (first) first.focus()
              } else
                general.textContent =
                  out.error || "Something went wrong. Please try again."
            } catch {
              general.textContent =
                "I could not reach the server. Please try again."
            }
            start.disabled = false
          },
        })
        const fields = [
          field(
            "name",
            "Your name",
            { type: "text", autocomplete: "name", maxlength: "100" },
            f.name,
          ),
          field(
            "email",
            "Email",
            { type: "email", autocomplete: "email", maxlength: "320" },
            f.email,
          ),
          field(
            "phone",
            "Phone",
            { type: "tel", autocomplete: "tel", maxlength: "40" },
            f.phone,
          ),
          field(
            "location",
            "Where are you?",
            { type: "text", maxlength: "120", placeholder: "City or area" },
            f.location,
          ),
        ]
        if (f.intro) pre.append(el("p", { class: "intro" }, f.intro))
        for (const x of fields) if (x) pre.append(x)
        if (f.emailOrPhone && f.email !== "off" && f.phone !== "off")
          pre.append(
            el(
              "p",
              { class: "notice", style: "margin:0 0 10px" },
              "Please add an email or a phone number.",
            ),
          )
        pre.append(general, start)
        if (f.notice) pre.append(el("p", { class: "notice" }, f.notice))
        panel.replaceChildren(head, pre)
        const firstInput = pre.querySelector("input")
        if (firstInput) firstInput.focus()
      }
      panel.addEventListener("keydown", (e) => {
        if (e.key === "Escape") toggle()
      })
      root.append(panel)
      launch.setAttribute("aria-expanded", "true")
      if (config.form) showForm()
      else showChat()
    }
    const launch = el(
      "button",
      {
        class: "launch",
        type: "button",
        "aria-label": `Open ${config.name}`,
        "aria-expanded": "false",
        onclick: toggle,
      },
      icon(),
    )
    root.append(launch)
  }
  if (document.readyState === "loading")
    document.addEventListener("DOMContentLoaded", start)
  else start()
})()
