const dateFmt = new Intl.DateTimeFormat("en", {
  dateStyle: "medium",
  timeStyle: "short",
})
const dayFmt = new Intl.DateTimeFormat("en", { dateStyle: "medium" })

export const formatDateTime = (iso: string | null | undefined) =>
  iso ? dateFmt.format(new Date(iso)) : " - "

export const formatDate = (iso: string | null | undefined) =>
  iso ? dayFmt.format(new Date(iso)) : " - "

export const timeAgo = (iso: string | null | undefined, now = Date.now()) => {
  if (!iso) return " - "
  const s = Math.round((now - new Date(iso).getTime()) / 1000)
  if (s < 60) return "just now"
  if (s < 3600) return `${Math.floor(s / 60)}m ago`
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`
  if (s < 86400 * 30) return `${Math.floor(s / 86400)}d ago`
  return formatDate(iso)
}
