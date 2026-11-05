export const PAGE_SIZE = 25

/** Parse ?page= safely and return offset/limit bounds. */
export const pageParams = (url: URL, size = PAGE_SIZE) => {
  const raw = Number(url.searchParams.get("page"))
  const page = Number.isInteger(raw) && raw > 0 && raw < 10_000 ? raw : 1
  const from = (page - 1) * size
  return { page, size, from, to: from + size - 1 }
}

export const searchParam = (url: URL, max = 100) =>
  (url.searchParams.get("q") ?? "").trim().slice(0, max)
