// Turns the brand colours chosen in Admin -> Site into CSS variables for the
// DaisyUI theme. Inputs are validated hex colours, so the output is safe to
// inline in a <style> tag.

const HEX = /^#[0-9a-fA-F]{6}$/

const luminance = (hex: string) => {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

/** Black or white, whichever has better contrast on `hex`. */
export const contentColor = (hex: string) =>
  luminance(hex) > 0.179 ? "#0f172a" : "#ffffff"

export const themeCss = (primary: string, accent: string): string => {
  if (!HEX.test(primary) || !HEX.test(accent)) return ""
  return (
    `:root{--color-primary:${primary};--color-primary-content:${contentColor(primary)};` +
    `--color-accent:${accent};--color-accent-content:${contentColor(accent)};}`
  )
}
