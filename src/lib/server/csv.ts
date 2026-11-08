// Neutralises spreadsheet formula injection (=, +, -, @) and quotes safely.
const cell = (v: string | number | null | undefined) => {
  let s = v === null || v === undefined ? "" : String(v)
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`
  return `"${s.replace(/"/g, '""')}"`
}

export const csvResponse = (
  filename: string,
  header: string[],
  rows: (string | number | null | undefined)[][],
) =>
  new Response(
    [
      header.map(cell).join(","),
      ...rows.map((r) => r.map(cell).join(",")),
    ].join("\r\n") + "\r\n",
    {
      headers: {
        "content-type": "text/csv; charset=utf-8",
        "content-disposition": `attachment; filename="${filename}"`,
        "cache-control": "private, no-store",
      },
    },
  )
