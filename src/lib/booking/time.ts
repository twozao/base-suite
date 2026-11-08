// Time zone arithmetic on Intl only, shared by server and browser. Dates are YYYY-MM-DD strings.
const formatters = new Map<string, Intl.DateTimeFormat>()

const formatter = (timeZone: string) => {
  let f = formatters.get(timeZone)
  if (!f) {
    f = new Intl.DateTimeFormat("en-US", {
      timeZone,
      hourCycle: "h23",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    })
    formatters.set(timeZone, f)
  }
  return f
}

export const isValidTimeZone = (tz: string) => {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: tz })
    return true
  } catch {
    return false
  }
}

const parts = (ms: number, tz: string) => {
  const out: Record<string, number> = {}
  for (const p of formatter(tz).formatToParts(new Date(ms))) {
    if (p.type !== "literal") out[p.type] = Number(p.value)
  }
  return out
}

const offsetMs = (ms: number, tz: string) => {
  const p = parts(ms, tz)
  return (
    Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second) -
    Math.floor(ms / 1000) * 1000
  )
}

/** The instant for a wall clock time in a zone. A time skipped by a clock change moves forward. */
export const zonedToUtc = (date: string, time: string, tz: string): number => {
  const [y, m, d] = date.split("-").map(Number)
  const [hh, mm] = time.split(":").map(Number)
  const guess = Date.UTC(y, m - 1, d, hh, mm)
  const first = guess - offsetMs(guess, tz)
  const second = guess - offsetMs(first, tz)
  return offsetMs(second, tz) === offsetMs(first, tz)
    ? second
    : Math.max(first, second)
}

const pad = (n: number) => String(n).padStart(2, "0")

/** The calendar date of an instant in a zone. */
export const localDate = (ms: number, tz: string) => {
  const p = parts(ms, tz)
  return `${p.year}-${pad(p.month)}-${pad(p.day)}`
}

export const addDays = (date: string, days: number) => {
  const [y, m, d] = date.split("-").map(Number)
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10)
}

/** 0 = Sunday. */
export const weekdayOf = (date: string) => {
  const [y, m, d] = date.split("-").map(Number)
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay()
}

export const formatInZone = (
  iso: string,
  tz: string,
  options: Intl.DateTimeFormatOptions = {
    dateStyle: "full",
    timeStyle: "short",
  },
) =>
  new Intl.DateTimeFormat("en", { ...options, timeZone: tz }).format(
    new Date(iso),
  )
