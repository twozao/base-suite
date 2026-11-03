// Module catalogue + runtime state, shared by server and client code.
//
// Base Suite is a small core plus independent modules (like Axelor / Odoo):
//   * A module is INSTALLED when it is compiled in (src/config.ts).
//   * An installed module is ACTIVE when the owner switches it on in
//     Admin -> Modules and every module it depends on is active too.
// Each manifest declares its category, dependencies, permissions and admin
// pages, so navigation, route guards and the Modules screen stay in sync.
import { InstalledModules } from "../config"
import type { Permission } from "./permissions"

export type InstalledModuleId = keyof typeof InstalledModules
export type ModuleId = InstalledModuleId
export type ModuleCategory =
  | "Website"
  | "Engage"
  | "Sell"
  | "Customers"
  | "Operate"
  | "Insights"

export type AdminNavItem = {
  href: string
  label: string
  permission: Permission
  icon: string // SVG path data (24x24, stroke)
  module?: ModuleId
  group: "Overview" | "Content" | "Customers" | "Growth" | "Configuration"
}

export type ModuleManifest = {
  id: ModuleId
  name: string
  summary: string
  category: ModuleCategory
  dependsOn: ModuleId[]
  defaultActive: boolean
  /** What the module adds, shown on the Modules screen */
  provides: string[]
}

/** Modules on the roadmap: shown in the catalogue, not yet installable. */
export type PlannedModule = {
  id: string
  name: string
  summary: string
  category: ModuleCategory
  dependsOn: string[]
}

export const MODULES: ModuleManifest[] = [
  {
    id: "cms",
    name: "Pages & Blog",
    summary:
      "Publish pages and blog posts with a Markdown editor, revisions, SEO fields, RSS and sitemap.",
    category: "Website",
    dependsOn: [],
    defaultActive: true,
    provides: ["/your-page URLs", "/blog + RSS", "Admin → Pages, Blog"],
  },
  {
    id: "contact",
    name: "Contact form",
    summary:
      "Spam-protected contact form with an inbox, statuses and internal notes.",
    category: "Engage",
    dependsOn: [],
    defaultActive: true,
    provides: ["/contact_us", "Admin → Contact inbox", "Email alerts"],
  },
  {
    id: "chat",
    name: "Live chat",
    summary:
      "Chat widget on every page and a shared support inbox with assignment and unread counts.",
    category: "Engage",
    dependsOn: [],
    defaultActive: true,
    provides: ["Chat widget", "Customer portal → Support", "Admin → Live chat"],
  },
  {
    id: "booking",
    name: "Online booking",
    summary:
      "Let visitors book calls through Calendly; bookings sync into the portal via webhook.",
    category: "Engage",
    dependsOn: [],
    defaultActive: true,
    provides: ["/book", "Customer portal → My bookings", "Admin → Bookings"],
  },
  {
    id: "newsletter",
    name: "Newsletter",
    summary:
      "Double opt-in email signups, one-click unsubscribe and CSV export to your email tool.",
    category: "Engage",
    dependsOn: [],
    defaultActive: true,
    provides: ["Signup form in footer and blog", "Admin → Newsletter"],
  },
  {
    id: "subscriptions",
    name: "Subscriptions",
    summary:
      "Sell plans with Stripe Checkout; customers manage billing themselves.",
    category: "Sell",
    dependsOn: [],
    defaultActive: true,
    provides: [
      "/pricing",
      "Customer portal → Billing",
      "Admin → Subscriptions, Pricing plans",
    ],
  },
  {
    id: "crm",
    name: "CRM",
    summary:
      "Every lead in one place: contacts from forms, chats, bookings and signups, a deal pipeline and an activity timeline.",
    category: "Customers",
    dependsOn: [],
    defaultActive: true,
    provides: [
      "Admin → CRM contacts, Deals pipeline",
      "Automatic lead capture",
    ],
  },
  {
    id: "analytics",
    name: "Analytics",
    summary:
      "Cookie-free, privacy-friendly page view counts, top pages and referrers. Respects Do Not Track.",
    category: "Insights",
    dependsOn: [],
    defaultActive: true,
    provides: ["Admin → Analytics", "Dashboard traffic tile"],
  },
].filter(
  (m) => m.id in InstalledModules && InstalledModules[m.id as ModuleId],
) as ModuleManifest[]

export const PLANNED_MODULES: PlannedModule[] = [
  {
    id: "helpdesk",
    name: "Helpdesk",
    summary:
      "Tickets with SLAs, canned replies and email-in; chats and contact requests become tickets.",
    category: "Customers",
    dependsOn: ["crm"],
  },
  {
    id: "knowledge-base",
    name: "Knowledge base",
    summary:
      "Searchable help articles with categories and 'was this helpful' feedback.",
    category: "Customers",
    dependsOn: ["cms"],
  },
  {
    id: "invoicing",
    name: "Invoicing",
    summary:
      "Quotes and invoices with PDF, online payment links and reminders.",
    category: "Sell",
    dependsOn: ["crm"],
  },
  {
    id: "shop",
    name: "Shop",
    summary:
      "Product catalogue, cart and one-off Stripe payments for physical or digital goods.",
    category: "Sell",
    dependsOn: [],
  },
  {
    id: "events",
    name: "Events",
    summary: "Event pages with ticketing, capacity and attendee check-in.",
    category: "Sell",
    dependsOn: [],
  },
  {
    id: "forms",
    name: "Form builder",
    summary:
      "Drag-and-drop forms (surveys, applications) with submissions inbox.",
    category: "Engage",
    dependsOn: [],
  },
  {
    id: "campaigns",
    name: "Email campaigns",
    summary: "Write and send newsletters to subscribers with open/click stats.",
    category: "Engage",
    dependsOn: ["newsletter"],
  },
  {
    id: "reviews",
    name: "Reviews",
    summary: "Collect and publish customer reviews and testimonials.",
    category: "Engage",
    dependsOn: ["crm"],
  },
  {
    id: "projects",
    name: "Projects & tasks",
    summary:
      "Client projects with tasks, boards and due dates; share progress in the customer portal.",
    category: "Operate",
    dependsOn: ["crm"],
  },
  {
    id: "team",
    name: "Team & HR",
    summary: "Staff directory, leave requests and timesheets.",
    category: "Operate",
    dependsOn: [],
  },
  {
    id: "expenses",
    name: "Expenses",
    summary: "Log and categorise expenses with receipts.",
    category: "Operate",
    dependsOn: [],
  },
  {
    id: "multilingual",
    name: "Multilingual",
    summary: "Translate pages, posts and UI; per-locale URLs and hreflang.",
    category: "Website",
    dependsOn: ["cms"],
  },
  {
    id: "reports",
    name: "Reports",
    summary: "Revenue, funnel and support reports across modules.",
    category: "Insights",
    dependsOn: ["analytics"],
  },
]

// ---------------------------------------------------------------------------
// Runtime state
// ---------------------------------------------------------------------------

const DEFAULTS = Object.fromEntries(
  MODULES.map((m) => [m.id, m.defaultActive]),
) as Record<ModuleId, boolean>

let switches: Record<string, boolean> = { ...DEFAULTS }

/** Resolve owner switches into the active set (installed + on + deps active). */
export const resolveActive = (sw: Record<string, boolean>): Set<ModuleId> => {
  const active = new Set<ModuleId>()
  let changed = true
  const wanted = MODULES.filter((m) => sw[m.id] ?? m.defaultActive)
  while (changed) {
    changed = false
    for (const m of wanted) {
      if (!active.has(m.id) && m.dependsOn.every((d) => active.has(d))) {
        active.add(m.id)
        changed = true
      }
    }
  }
  return active
}

let active = resolveActive(switches)

/** Called once per request by the server hook with the saved switches. */
export const setModuleSwitches = (sw: Record<string, boolean>) => {
  switches = { ...DEFAULTS, ...sw }
  active = resolveActive(switches)
}

export const moduleSwitches = () => ({ ...switches })

export const isModuleEnabled = (id: ModuleId): boolean => active.has(id)

export const activeModules = (): ModuleId[] => [...active]

/** Modules that would be switched off if `id` were turned off. */
export const dependentsOf = (id: ModuleId): ModuleId[] =>
  MODULES.filter((m) => m.dependsOn.includes(id)).map((m) => m.id)

// ---------------------------------------------------------------------------
// Admin navigation
// ---------------------------------------------------------------------------

const ICONS = {
  dashboard: "M3 12l9-9 9 9M5 10v10h5v-6h4v6h5V10",
  users:
    "M17 20h5v-2a4 4 0 00-5-3.9M17 20H7m10 0v-2c0-.7-.1-1.3-.4-1.9M7 20H2v-2a4 4 0 015-3.9M7 20v-2c0-.7.1-1.3.4-1.9m0 0a5 5 0 019.2 0M15 7a3 3 0 11-6 0 3 3 0 016 0z",
  card: "M3 10h18M7 15h2m4 0h4M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z",
  pages:
    "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.6a1 1 0 01.7.3l5.4 5.4a1 1 0 01.3.7V19a2 2 0 01-2 2z",
  inbox:
    "M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.6a1 1 0 00-.7.3l-2.4 2.4a1 1 0 01-.7.3h-3.2a1 1 0 01-.7-.3l-2.4-2.4a1 1 0 00-.7-.3H4",
  chat: "M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z",
  calendar:
    "M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z",
  audit:
    "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4",
  home: "M4 5h16v6H4zM4 15h7v4H4zm11 0h5v4h-5z",
  blog: "M4 4h16v16H4zM8 8h8M8 12h8M8 16h5",
  image:
    "M4 5h16a1 1 0 011 1v12a1 1 0 01-1 1H4a1 1 0 01-1-1V6a1 1 0 011-1zm0 11l5-5 4 4 3-3 4 4M15 9.5a1.5 1.5 0 100-3 1.5 1.5 0 000 3z",
  brush: "M7 21a4 4 0 01-4-4c0-2 2-3 2-5a3 3 0 016 0v3a6 6 0 01-4 6zm4-9l9-9",
  tag: "M3 12V4a1 1 0 011-1h8l9 9-9 9-9-9zm5-4.5v.01",
  contact:
    "M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z",
  funnel: "M3 4h18l-7 9v6l-4 2v-8L3 4z",
  mail: "M4 6h16a1 1 0 011 1v10a1 1 0 01-1 1H4a1 1 0 01-1-1V7a1 1 0 011-1zm0 1l8 6 8-6",
  chart: "M4 20V10m6 10V4m6 16v-7m4 7H2",
  puzzle:
    "M11 4a2 2 0 114 0v1h3a1 1 0 011 1v3h-1a2 2 0 100 4h1v3a1 1 0 01-1 1h-3v-1a2 2 0 10-4 0v1H8a1 1 0 01-1-1v-3H6a2 2 0 110-4h1V6a1 1 0 011-1h3V4z",
  settings:
    "M10.3 4.3c.4-1.7 3-1.7 3.4 0a1.7 1.7 0 002.6 1.1c1.5-.9 3.3.8 2.4 2.4a1.7 1.7 0 001 2.5c1.8.4 1.8 3 0 3.4a1.7 1.7 0 00-1 2.6c.9 1.5-.9 3.3-2.4 2.4a1.7 1.7 0 00-2.6 1c-.4 1.8-3 1.8-3.4 0a1.7 1.7 0 00-2.6-1c-1.5.9-3.3-.9-2.4-2.4a1.7 1.7 0 00-1-2.6c-1.8-.4-1.8-3 0-3.4a1.7 1.7 0 001-2.6c-.9-1.5.9-3.3 2.4-2.4 1 .6 2.3.1 2.6-1zM15 12a3 3 0 11-6 0 3 3 0 016 0z",
}

const ALL_ADMIN_NAV: AdminNavItem[] = [
  {
    group: "Overview",
    href: "/admin",
    label: "Dashboard",
    permission: "admin.access",
    icon: ICONS.dashboard,
  },
  {
    group: "Overview",
    href: "/admin/analytics",
    label: "Analytics",
    permission: "analytics.view",
    icon: ICONS.chart,
    module: "analytics",
  },

  {
    group: "Content",
    href: "/admin/homepage",
    label: "Homepage",
    permission: "cms.edit",
    icon: ICONS.home,
  },
  {
    group: "Content",
    href: "/admin/pages",
    label: "Pages",
    permission: "cms.edit",
    icon: ICONS.pages,
    module: "cms",
  },
  {
    group: "Content",
    href: "/admin/blog",
    label: "Blog",
    permission: "cms.edit",
    icon: ICONS.blog,
    module: "cms",
  },
  {
    group: "Content",
    href: "/admin/media",
    label: "Media",
    permission: "cms.edit",
    icon: ICONS.image,
  },

  {
    group: "Customers",
    href: "/admin/crm",
    label: "CRM contacts",
    permission: "crm.manage",
    icon: ICONS.contact,
    module: "crm",
  },
  {
    group: "Customers",
    href: "/admin/crm/deals",
    label: "Deals pipeline",
    permission: "crm.manage",
    icon: ICONS.funnel,
    module: "crm",
  },
  {
    group: "Customers",
    href: "/admin/support",
    label: "Live chat",
    permission: "chat.respond",
    icon: ICONS.chat,
    module: "chat",
  },
  {
    group: "Customers",
    href: "/admin/contact",
    label: "Contact inbox",
    permission: "contact.manage",
    icon: ICONS.inbox,
    module: "contact",
  },
  {
    group: "Customers",
    href: "/admin/bookings",
    label: "Bookings",
    permission: "bookings.view",
    icon: ICONS.calendar,
    module: "booking",
  },
  {
    group: "Customers",
    href: "/admin/users",
    label: "Users",
    permission: "users.view",
    icon: ICONS.users,
  },

  {
    group: "Growth",
    href: "/admin/newsletter",
    label: "Newsletter",
    permission: "newsletter.manage",
    icon: ICONS.mail,
    module: "newsletter",
  },
  {
    group: "Growth",
    href: "/admin/subscriptions",
    label: "Subscriptions",
    permission: "billing.view",
    icon: ICONS.card,
    module: "subscriptions",
  },

  {
    group: "Configuration",
    href: "/admin/modules",
    label: "Modules",
    permission: "settings.manage",
    icon: ICONS.puzzle,
  },
  {
    group: "Configuration",
    href: "/admin/site",
    label: "Brand & navigation",
    permission: "settings.manage",
    icon: ICONS.brush,
  },
  {
    group: "Configuration",
    href: "/admin/pricing",
    label: "Pricing plans",
    permission: "settings.manage",
    icon: ICONS.tag,
    module: "subscriptions",
  },
  {
    group: "Configuration",
    href: "/admin/settings",
    label: "Settings",
    permission: "settings.manage",
    icon: ICONS.settings,
  },
  {
    group: "Configuration",
    href: "/admin/audit",
    label: "Audit log",
    permission: "audit.view",
    icon: ICONS.audit,
  },
]

export const adminNavFor = (permissions: ReadonlySet<Permission>) =>
  ALL_ADMIN_NAV.filter(
    (item) =>
      permissions.has(item.permission) &&
      (!item.module || isModuleEnabled(item.module)),
  )
