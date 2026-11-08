// Checks around every answer. Blocked topics are the admin's own list; the rest are fixed safety rails.
const INJECTION = [
  /\b(ignore|disregard|forget)\b[^.?!]{0,40}\b(previous|prior|above|earlier|all)\b[^.?!]{0,30}\b(instructions?|rules?|prompts?)\b/i,
  /\b(show|reveal|print|repeat|tell me|what (is|are))\b[^.?!]{0,30}\b(system prompt|your (instructions|rules|prompt)|hidden instructions)\b/i,
  /\b(jailbreak|developer mode|do anything now)\b/i,
]

export const looksLikeInjection = (q: string) =>
  INJECTION.some((r) => r.test(q))

/** One topic per line: a word or phrase, or /regex/. A broken regex is ignored rather than blocking everything. */
export const matchesBlockedTopic = (q: string, list: string) => {
  const text = q.toLowerCase()
  for (const raw of list.split(/\r?\n/)) {
    const line = raw.trim()
    if (!line) continue
    const re = /^\/(.+)\/([a-z]*)$/.exec(line)
    if (re) {
      try {
        if (new RegExp(re[1], re[2].replace(/[^i]/g, "") || "i").test(q))
          return line
      } catch {
        /* skip a broken pattern */
      }
    } else if (text.includes(line.toLowerCase())) return line
  }
  return null
}

const SECRET_SHAPES = [
  /\bsk-[a-zA-Z0-9_-]{16,}\b/g,
  /\bsk-ant-[a-zA-Z0-9_-]{16,}\b/g,
  /\bgh[pousr]_[A-Za-z0-9]{20,}\b/g,
  /\bAIza[0-9A-Za-z_-]{30,}\b/g,
  /\bAKIA[0-9A-Z]{16}\b/g,
  /\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{5,}\b/g,
  /-----BEGIN [A-Z ]*PRIVATE KEY-----[\s\S]*?-----END [A-Z ]*PRIVATE KEY-----/g,
]

export const scrubSecrets = (text: string) =>
  SECRET_SHAPES.reduce((t, re) => t.replace(re, "[removed]"), text)

/** True when a reply repeats a long stretch of the instructions it was given. */
export const leaksInstructions = (reply: string, instructions: string[]) => {
  const r = reply.toLowerCase().replace(/\s+/g, " ")
  return instructions.some((ins) => {
    const s = ins.toLowerCase().replace(/\s+/g, " ").trim()
    if (s.length < 60) return false
    for (let i = 0; i + 60 <= s.length; i += 30)
      if (r.includes(s.slice(i, i + 60))) return true
    return false
  })
}
