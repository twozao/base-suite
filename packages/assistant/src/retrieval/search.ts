import { decodeVector } from "../crypto"
import type { Settings } from "../settings"
import type { Audience } from "../store/store"
import { tokens } from "./text"

export type IndexRow = {
  id: string
  sourceId: string
  heading: string
  text: string
  vec: string | null
  vecModel: string | null
  title: string
  audience: Audience
  origin: string | null
}
type Item = IndexRow & {
  terms: Map<string, number>
  length: number
  nvec: Float32Array | null
}

export type SearchIndex = {
  items: Item[]
  df: Map<string, number>
  avgLen: number
  mean: Float32Array | null
  model: string | null
}
export type Hit = {
  id: string
  sourceId: string
  title: string
  heading: string
  text: string
  origin: string | null
  score: number
  matched: number
  coverage: number
  cos: number | null
}
export type SearchResult = {
  hits: Hit[]
  /** Good enough to hand to the AI. */
  confident: boolean
  /** Good enough to quote with no AI to check it. */
  strong: boolean
  why: string
  usedEmbedding: boolean
}

// Quoting a passage verbatim with no AI needs more than handing it to one.
const STRONG_MATCHED = 3
const STRONG_COVERAGE = 0.75
const STRONG_COSINE = 0.1
const PAGE_BOOST = 0.5
const BM25_K = 1.4
const BM25_B = 0.75

const normalise = (v: Float32Array) => {
  let n = 0
  for (const x of v) n += x * x
  n = Math.sqrt(n) || 1
  return v.map((x) => x / n)
}

/** Raw Needle vectors all sit close together, so each one is centred on the corpus mean before cosine is taken. */
const centre = (v: Float32Array, mean: Float32Array) =>
  normalise(v.map((x, i) => x - mean[i]))

export const buildIndex = (
  rows: IndexRow[],
  model: string | null,
): SearchIndex => {
  const df = new Map<string, number>()
  let totalLen = 0
  const items: Item[] = rows.map((r) => {
    const toks = tokens(`${r.title} ${r.heading} ${r.text}`)
    const terms = new Map<string, number>()
    for (const t of toks) terms.set(t, (terms.get(t) ?? 0) + 1)
    for (const t of terms.keys()) df.set(t, (df.get(t) ?? 0) + 1)
    totalLen += toks.length
    return { ...r, terms, length: toks.length, nvec: null }
  })
  const vecs = model
    ? items.flatMap((it) =>
        it.vec && it.vecModel === model
          ? [{ it, v: decodeVector(it.vec) }]
          : [],
      )
    : []
  let mean: Float32Array | null = null
  // A mean of one or two passages would cancel them out, so semantic ranking waits for a few.
  if (vecs.length >= 3) {
    const dim = vecs[0].v.length
    mean = new Float32Array(dim)
    for (const { v } of vecs) for (let i = 0; i < dim; i++) mean[i] += v[i]
    for (let i = 0; i < dim; i++) mean[i] /= vecs.length
    for (const e of vecs) e.it.nvec = centre(e.v, mean)
  }
  return { items, df, avgLen: totalLen / (items.length || 1), mean, model }
}

const zscores = (vals: number[]) => {
  const m = vals.reduce((a, b) => a + b, 0) / (vals.length || 1)
  const sd =
    Math.sqrt(
      vals.reduce((a, b) => a + (b - m) ** 2, 0) / (vals.length || 1),
    ) || 1
  return vals.map((v) => (v - m) / sd)
}

const round = (n: number) => Math.round(n * 1000) / 1000

const canRead = (audience: Audience, role: Audience) =>
  audience === "public" ||
  role === "admin" ||
  (audience === "user" && role === "user")

/** Hybrid search. Access is filtered first: nothing a person may not read is ever ranked, cited or counted. */
export const search = (
  index: SearchIndex,
  question: string,
  role: Audience,
  settings: Pick<
    Settings,
    | "topK"
    | "minMatched"
    | "minCoverage"
    | "minCosine"
    | "cosWeight"
    | "meaningCosine"
  >,
  queryVec: Float32Array | null,
  /** The page the question was asked on. A passage from it ranks a little higher: "how much is this?" */
  currentPage: string | null = null,
): SearchResult => {
  const pool = index.items.filter((it) => canRead(it.audience, role))
  const qTerms = [...new Set(tokens(question))]
  if (!qTerms.length || !pool.length)
    return {
      hits: [],
      confident: false,
      strong: false,
      why: "no searchable words",
      usedEmbedding: false,
    }
  const q =
    queryVec && index.mean && queryVec.length === index.mean.length
      ? centre(queryVec, index.mean)
      : null
  const rows = pool.map((it) => {
    let bm25 = 0
    let matched = 0
    for (const t of qTerms) {
      const f = it.terms.get(t)
      if (!f) continue
      matched++
      const n = index.df.get(t) ?? 0
      const idf = Math.log(1 + (index.items.length - n + 0.5) / (n + 0.5))
      bm25 +=
        (idf * f * (BM25_K + 1)) /
        (f + BM25_K * (1 - BM25_B + (BM25_B * it.length) / index.avgLen))
    }
    let cos: number | null = null
    if (q && it.nvec) {
      cos = 0
      for (let i = 0; i < q.length; i++) cos += q[i] * it.nvec[i]
    }
    return { it, bm25, matched, cos, score: 0 }
  })
  const zb = zscores(rows.map((r) => r.bm25))
  const zc = q ? zscores(rows.map((r) => r.cos ?? 0)) : null
  rows.forEach((r, i) => {
    r.score = zc ? zb[i] + settings.cosWeight * zc[i] : zb[i]
    if (currentPage && r.it.origin === currentPage) r.score += PAGE_BOOST
  })
  rows.sort((a, b) => b.score - a.score)
  // On keywords alone, a passage with one word many times must not beat one that has every word asked about.
  if (!zc) {
    const most = Math.max(...rows.map((r) => r.matched))
    const i = rows.findIndex((r) => r.matched === most)
    if (i > 0) rows.unshift(...rows.splice(i, 1))
  }

  const toHit = (r: (typeof rows)[number]): Hit => ({
    id: r.it.id,
    sourceId: r.it.sourceId,
    title: r.it.title,
    heading: r.it.heading,
    text: r.it.text,
    origin: r.it.origin,
    score: round(r.score),
    matched: r.matched,
    coverage: round(r.matched / qTerms.length),
    cos: r.cos === null ? null : round(r.cos),
  })
  const first = rows[0]
  // The best passage always stays; others only if they share words with the question, so nothing unrelated gets cited.
  const hits: Hit[] = rows
    .slice(0, settings.topK)
    .filter((r) => r === first || r.matched > 0)
    .map(toHit)
  const top = hits[0]
  // A short question can match in full with fewer words than the usual minimum.
  const needMatched = Math.min(settings.minMatched, qTerms.length)
  const byWords =
    !!top &&
    top.matched >= needMatched &&
    top.coverage >= settings.minCoverage &&
    (top.cos === null || top.cos >= settings.minCosine)
  // Short questions rarely match two words; a word that matches plus agreement on meaning is as good.
  const byMeaning =
    !!top &&
    top.matched >= 1 &&
    top.cos !== null &&
    top.cos >= settings.meaningCosine
  const confident = byWords || byMeaning
  const strong =
    byWords &&
    top.matched >= Math.min(STRONG_MATCHED, qTerms.length) &&
    top.coverage >= STRONG_COVERAGE &&
    (top.cos === null ? top.coverage >= 1 : top.cos >= STRONG_COSINE)
  return {
    hits,
    confident,
    strong,
    why: !top
      ? "no hits"
      : `matched ${top.matched}/${qTerms.length}, coverage ${top.coverage}${top.cos === null ? ", keywords only" : `, cosine ${top.cos}`}`,
    usedEmbedding: !!q,
  }
}

export const passagePrefix = (title: string, heading: string, text: string) =>
  `${title}${heading ? ` - ${heading}` : ""}\n${text}`.slice(0, 1500)
