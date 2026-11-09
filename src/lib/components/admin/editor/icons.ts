import type { BlockType } from "$lib/blocks"

// 24x24 stroke icons for blocks and the formatting toolbar.
export const BLOCK_ICONS: Record<BlockType, string> = {
  markdown: "M4 6h16M4 12h16M4 18h10",
  heading: "M6 4v16M18 4v16M6 12h12",
  image:
    "M4 5h16v14H4zM8.500 10a1.500 1.500 0 100-3 1.500 1.500 0 000 3zM20 15l-5-5-9 9",
  gallery: "M3 3h8v8H3zM13 3h8v8h-8zM3 13h8v8H3zM13 13h8v8h-8z",
  columns: "M4 4h7v16H4zM13 4h7v16h-7z",
  quote: "M7 7h4v4c0 3-2 5-4 6M15 7h4v4c0 3-2 5-4 6",
  button: "M3 8h18v8H3zM8 12h8",
  cta: "M4 5h16v14H4zM8 10h8M9 14h6",
  faq: "M9 9a3 3 0 115 2c-1 .700-2 1.300-2 3m0 3h.01M12 21a9 9 0 110-18 9 9 0 010 18z",
  embed: "M4 6h16v12H4zM10 9l5 3-5 3z",
  divider: "M3 12h18",
  html: "M8 8l-4 4 4 4M16 8l4 4-4 4M14 5l-4 14",
  reusable: "M8 8V5h11v11h-3M5 8h11v11H5z",
  form: "M6 3h12v18H6zM9 8h6M9 12h6M9 16h3",
  app: "M12 3l8 4.500v9L12 21l-8-4.500v-9zM12 12l8-4.500M12 12v9M12 12L4 7.500",
}

export const TOOL_ICONS = {
  bold: "M7 5h6a3.500 3.500 0 010 7H7zM7 12h7a3.500 3.500 0 010 7H7z",
  italic: "M14 5h-4M14 19h-4M14 5l-4 14",
  strike:
    "M5 12h14M16 7a4 3 0 00-4-2c-2.500 0-4 1.200-4 3M8 17a4 3 0 004 2c2.500 0 4-1.200 4-3",
  code: "M9 8l-4 4 4 4M15 8l4 4-4 4",
  link: "M10 14a4 4 0 005.700 0l3-3a4 4 0 00-5.700-5.700l-1 1M14 10a4 4 0 00-5.700 0l-3 3a4 4 0 005.700 5.700l1-1",
  bullet: "M9 6h11M9 12h11M9 18h11M4.500 6h.01M4.500 12h.01M4.500 18h.01",
  ordered: "M10 6h10M10 12h10M10 18h10M4 5l1-1v4M4 14h2l-2 3h2",
  quote: "M7 7h4v4c0 3-2 5-4 6M15 7h4v4c0 3-2 5-4 6",
  divider: "M3 12h18",
  image:
    "M4 5h16v14H4zM8.500 10a1.500 1.500 0 100-3 1.500 1.500 0 000 3zM20 15l-5-5-9 9",
  table: "M4 5h16v14H4zM4 10h16M4 15h16M10 5v14",
  undo: "M9 14L4 9l5-5M4 9h11a5 5 0 010 10h-3",
  redo: "M15 14l5-5-5-5M20 9H9a5 5 0 000 10h3",
  source: "M8 8l-4 4 4 4M16 8l4 4-4 4",
  up: "M12 19V5M6 11l6-6 6 6",
  down: "M12 5v14M6 13l6 6 6-6",
  copy: "M8 8V5h11v11h-3M5 8h11v11H5z",
  trash: "M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3",
  plus: "M12 5v14M5 12h14",
}
