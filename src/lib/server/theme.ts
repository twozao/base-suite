// Theme presets plus the brand colours chosen in Admin -> Brand & navigation, emitted as CSS
// variables for the DaisyUI theme. Inputs are validated hex colours, so the output is safe to inline.

const HEX = /^#[0-9a-fA-F]{6}$/

const SANS =
  'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
const SERIF =
  'ui-serif, Georgia, "Iowan Old Style", "Palatino Linotype", "Times New Roman", serif'
const ROUNDED = `ui-rounded, "SF Pro Rounded", ${SANS}`

export const THEME_IDS = ["fresh", "studio", "corporate", "minimal"] as const
export type ThemeId = (typeof THEME_IDS)[number]

export type ThemePreset = {
  label: string
  description: string
  colorScheme: "light" | "dark"
  base100: string
  base200: string
  base300: string
  baseContent: string
  secondary: string
  secondaryContent: string
  radiusBox: string
  radiusField: string
  radiusSelector: string
  fontBody: string
  fontHeading: string
  /** split: text left, visual right. centered: one column, no visual. */
  heroLayout: "split" | "centered"
}

export const THEMES: Record<ThemeId, ThemePreset> = {
  fresh: {
    label: "Fresh",
    description:
      "Light, rounded and friendly. The default for product and SaaS sites.",
    colorScheme: "light",
    base100: "#ffffff",
    base200: "#f8fafc",
    base300: "#e2e8f0",
    baseContent: "#0f172a",
    secondary: "#e0e7ff",
    secondaryContent: "#312e81",
    radiusBox: "0.75rem",
    radiusField: "0.5rem",
    radiusSelector: "0.5rem",
    fontBody: SANS,
    fontHeading: SANS,
    heroLayout: "split",
  },
  studio: {
    label: "Studio",
    description: "Dark, bold and rounded. Suits agencies and creative studios.",
    colorScheme: "dark",
    base100: "#0b1020",
    base200: "#121a2e",
    base300: "#243049",
    baseContent: "#e6eaf3",
    secondary: "#1e293b",
    secondaryContent: "#c7d2fe",
    radiusBox: "1.25rem",
    radiusField: "0.75rem",
    radiusSelector: "0.75rem",
    fontBody: SANS,
    fontHeading: ROUNDED,
    heroLayout: "split",
  },
  corporate: {
    label: "Corporate",
    description:
      "Cool greys, tight corners and a navy feel. Suits large organisations.",
    colorScheme: "light",
    base100: "#ffffff",
    base200: "#f3f5f8",
    base300: "#d7dde6",
    baseContent: "#111827",
    secondary: "#e5ecf6",
    secondaryContent: "#1e3a5f",
    radiusBox: "0.375rem",
    radiusField: "0.25rem",
    radiusSelector: "0.25rem",
    fontBody: SANS,
    fontHeading: SANS,
    heroLayout: "centered",
  },
  minimal: {
    label: "Minimal",
    description:
      "Warm paper tones with serif headings. Suits portfolios and personal sites.",
    colorScheme: "light",
    base100: "#fdfcf9",
    base200: "#f5f2ea",
    base300: "#e4dfd2",
    baseContent: "#1c1917",
    secondary: "#ece7da",
    secondaryContent: "#44403c",
    radiusBox: "0.25rem",
    radiusField: "0.25rem",
    radiusSelector: "0.25rem",
    fontBody: SANS,
    fontHeading: SERIF,
    heroLayout: "centered",
  },
}

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

export const themeCss = (
  primary: string,
  accent: string,
  theme: ThemeId = "fresh",
): string => {
  if (!HEX.test(primary) || !HEX.test(accent)) return ""
  const t = THEMES[theme] ?? THEMES.fresh
  const vars = [
    `--color-primary:${primary}`,
    `--color-primary-content:${contentColor(primary)}`,
    `--color-accent:${accent}`,
    `--color-accent-content:${contentColor(accent)}`,
    `--color-secondary:${t.secondary}`,
    `--color-secondary-content:${t.secondaryContent}`,
    `--color-base-100:${t.base100}`,
    `--color-base-200:${t.base200}`,
    `--color-base-300:${t.base300}`,
    `--color-base-content:${t.baseContent}`,
    `--radius-box:${t.radiusBox}`,
    `--radius-field:${t.radiusField}`,
    `--radius-selector:${t.radiusSelector}`,
    `--bs-font-body:${t.fontBody}`,
    `--bs-font-heading:${t.fontHeading}`,
    `color-scheme:${t.colorScheme}`,
  ]
  return `:root{${vars.join(";")};}`
}
