// CRM constants shared by server and client.
export const DEAL_STAGES = [
  { id: "new", label: "New" },
  { id: "qualified", label: "Qualified" },
  { id: "proposal", label: "Proposal" },
  { id: "won", label: "Won" },
  { id: "lost", label: "Lost" },
] as const
export type DealStageId = (typeof DEAL_STAGES)[number]["id"]

export const formatMoney = (cents: number, currency: string) => {
  try {
    return new Intl.NumberFormat("en", {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(cents / 100)
  } catch {
    return `${(cents / 100).toFixed(0)} ${currency}`
  }
}
