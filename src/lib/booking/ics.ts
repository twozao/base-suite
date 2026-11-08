// iCalendar for the invite email and the Add to calendar download (RFC 5545).
const stamp = (iso: string) =>
  new Date(iso)
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}Z$/, "Z")

const escapeText = (s: string) =>
  s
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r?\n/g, "\\n")

/** Lines over 75 octets continue on the next line after one space. */
const fold = (line: string) => {
  const out: string[] = []
  let rest = line
  while (rest.length > 73) {
    out.push(rest.slice(0, 73))
    rest = rest.slice(73)
  }
  out.push(rest)
  return out.join("\r\n ")
}

export type CalendarEvent = {
  uid: string
  title: string
  start: string
  end: string
  description?: string
  location?: string
  sequence?: number
  canceled?: boolean
  now?: string
}

export const buildIcs = (e: CalendarEvent) =>
  [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Base Suite//Booking//EN",
    "CALSCALE:GREGORIAN",
    `METHOD:${e.canceled ? "CANCEL" : "PUBLISH"}`,
    "BEGIN:VEVENT",
    `UID:${e.uid}`,
    `DTSTAMP:${stamp(e.now ?? new Date().toISOString())}`,
    `DTSTART:${stamp(e.start)}`,
    `DTEND:${stamp(e.end)}`,
    `SEQUENCE:${e.sequence ?? 0}`,
    `SUMMARY:${escapeText(e.title)}`,
    ...(e.description ? [`DESCRIPTION:${escapeText(e.description)}`] : []),
    ...(e.location ? [`LOCATION:${escapeText(e.location)}`] : []),
    `STATUS:${e.canceled ? "CANCELLED" : "CONFIRMED"}`,
    "END:VEVENT",
    "END:VCALENDAR",
    "",
  ]
    .map((l) => (l ? fold(l) : l))
    .join("\r\n")

export const googleCalendarUrl = (e: CalendarEvent) => {
  const url = new URL("https://calendar.google.com/calendar/render")
  url.search = new URLSearchParams({
    action: "TEMPLATE",
    text: e.title,
    dates: `${stamp(e.start)}/${stamp(e.end)}`,
    details: e.description ?? "",
    location: e.location ?? "",
  }).toString()
  return url.toString()
}
