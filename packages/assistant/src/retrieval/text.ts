// Text handling for search. Letters, marks and numbers in any script: Tamil vowel signs are marks, not separators.
const STOP = new Set(
  "a about an and are as at be but by can do does for from has have how i if in is it its me my of on or our so that the their them then there these they this to us was we what when where which who why will with you your tell please give know want need would like could should".split(
    " ",
  ),
)

// Service and services are one word to a reader. Words ending in ss, us or is keep their s.
const singular = (w: string) =>
  w.length > 3 && /[a-z]s$/.test(w) && !/(ss|us|is)$/.test(w)
    ? w.slice(0, -1)
    : w

export const tokens = (text: string) =>
  (text.toLowerCase().match(/[\p{L}\p{M}\p{N}]+/gu) ?? [])
    .filter((w) => w.length > 1 && !STOP.has(w))
    .map(singular)

const MAX_CHUNK = 1200
const MIN_CHUNK = 200

/** Splits Markdown or plain text at headings, then paragraphs, into passages about one thing each. */
export const chunkText = (
  text: string,
): { heading: string; text: string }[] => {
  const out: { heading: string; text: string }[] = []
  let heading = ""
  let buf = ""
  const flush = () => {
    const t = buf.trim()
    if (t) out.push({ heading, text: t })
    buf = ""
  }
  for (const block of text.replace(/\r\n/g, "\n").split(/\n{2,}/)) {
    const h = /^#{1,6}\s+(.+)$/.exec(block.trim())
    if (h && !block.trim().includes("\n")) {
      flush()
      heading = h[1].trim().slice(0, 200)
      continue
    }
    if (buf.length + block.length > MAX_CHUNK && buf.length >= MIN_CHUNK)
      flush()
    if (block.length > MAX_CHUNK) {
      flush()
      for (let i = 0; i < block.length; i += MAX_CHUNK)
        out.push({ heading, text: block.slice(i, i + MAX_CHUNK).trim() })
      continue
    }
    buf += (buf ? "\n\n" : "") + block
  }
  flush()
  return out.filter((c) => c.text.length > 0)
}
