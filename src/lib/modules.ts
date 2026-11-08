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
  group:
    | "Overview"
    | "Content"
    | "Customers"
    | "Growth"
    | "Operations"
    | "Insights"
    | "Configuration"
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
    provides: ["/your-page URLs", "/blog + RSS", "Admin -> Pages, Blog"],
  },
  {
    id: "contact",
    name: "Contact form",
    summary:
      "Spam-protected contact form with an inbox, statuses and internal notes.",
    category: "Engage",
    dependsOn: [],
    defaultActive: true,
    provides: ["/contact_us", "Admin -> Contact inbox", "Email alerts"],
  },
  {
    id: "chat",
    name: "Live chat",
    summary:
      "Chat widget on every page and a shared support inbox with assignment and unread counts.",
    category: "Engage",
    dependsOn: [],
    defaultActive: true,
    provides: [
      "Chat widget",
      "Customer portal -> Support",
      "Admin -> Live chat",
    ],
  },
  {
    id: "booking",
    name: "Online booking",
    summary:
      "Let visitors book meetings on your own calendar: event types, availability, time zones, reschedule and cancel links, invites and reminders.",
    category: "Engage",
    dependsOn: [],
    defaultActive: true,
    provides: [
      "/book scheduling pages",
      "Customer portal -> My bookings",
      "Admin -> Bookings, Event types, Availability",
    ],
  },
  {
    id: "newsletter",
    name: "Newsletter",
    summary:
      "Double opt-in email signups, one-click unsubscribe and CSV export to your email tool.",
    category: "Engage",
    dependsOn: [],
    defaultActive: true,
    provides: ["Signup form in footer and blog", "Admin -> Newsletter"],
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
      "Customer portal -> Billing",
      "Admin -> Subscriptions, Pricing plans",
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
      "Admin -> CRM contacts, Deals pipeline",
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
    provides: ["Admin -> Analytics", "Dashboard traffic tile"],
  },
  {
    id: "assistant",
    name: "AI assistant",
    summary:
      "A chat that answers from your own content using Needle 3 search, with any mix of AI providers and MCP connections to other services.",
    category: "Engage",
    dependsOn: [],
    defaultActive: false,
    provides: [
      "AI chat bubble on the site",
      "Admin -> AI assistant",
      "Add your own model keys and MCP servers",
    ],
  },
  {
    id: "helpdesk",
    name: "Helpdesk",
    summary:
      "Tickets with priorities, SLA targets, canned replies and assignment. Contact requests and chats become tickets, and customers follow theirs in the portal.",
    category: "Customers",
    dependsOn: ["crm"],
    defaultActive: false,
    provides: [
      "Admin -> Helpdesk",
      "Customer portal -> Tickets",
      "Create a ticket from a chat or contact request",
    ],
  },
  {
    id: "kb",
    name: "Knowledge base",
    summary:
      "A searchable help centre with categories, articles and 'was this helpful?' feedback.",
    category: "Customers",
    dependsOn: ["cms"],
    defaultActive: false,
    provides: ["/help", "Admin -> Knowledge base", "Results in site search"],
  },
  {
    id: "forms",
    name: "Form builder",
    summary:
      "Build surveys and applications, each with its own page, spam protection, a submissions inbox and CSV export.",
    category: "Engage",
    dependsOn: [],
    defaultActive: false,
    provides: ["/forms/your-form", "Admin -> Forms", "Answers reach the CRM"],
  },
  {
    id: "campaigns",
    name: "Email campaigns",
    summary:
      "Write and send campaigns to newsletter subscribers, now or on a schedule, with one-click unsubscribe and open and click stats.",
    category: "Engage",
    dependsOn: ["newsletter"],
    defaultActive: false,
    provides: ["Admin -> Campaigns", "Needs a mail provider to send"],
  },
  {
    id: "projects",
    name: "Projects & tasks",
    summary:
      "Client projects with task boards and due dates. Share progress with the client in their customer portal.",
    category: "Operate",
    dependsOn: ["crm"],
    defaultActive: false,
    provides: ["Admin -> Projects", "Customer portal -> Projects"],
  },
  {
    id: "team",
    name: "Team & HR",
    summary:
      "Staff directory, leave requests with approval and timesheets. Approved leave for a booking host blocks those days on the calendar.",
    category: "Operate",
    dependsOn: [],
    defaultActive: false,
    provides: ["Admin -> Team", "Admin -> My time and leave"],
  },
  {
    id: "expenses",
    name: "Expenses",
    summary:
      "Log and categorise expenses with private receipts, approvals, monthly totals and CSV export.",
    category: "Operate",
    dependsOn: [],
    defaultActive: false,
    provides: ["Admin -> Expenses", "Costs per project", "Feeds Reports"],
  },
  {
    id: "i18n",
    name: "Multilingual",
    summary:
      "Translate pages, posts, help articles, menus, the homepage and site labels, with per-language URLs and hreflang.",
    category: "Website",
    dependsOn: ["cms"],
    defaultActive: false,
    provides: [
      "/fr/your-page URLs",
      "Language switcher",
      "Admin -> Translations",
    ],
  },
  {
    id: "reports",
    name: "Reports",
    summary:
      "Revenue, funnel, support, booking and campaign reports across your active modules, with CSV export.",
    category: "Insights",
    dependsOn: ["analytics"],
    defaultActive: false,
    provides: ["Admin -> Reports"],
  },
].filter(
  (m) => m.id in InstalledModules && InstalledModules[m.id as ModuleId],
) as ModuleManifest[]

export const PLANNED_MODULES: PlannedModule[] = [
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
    id: "reviews",
    name: "Reviews",
    summary: "Collect and publish customer reviews and testimonials.",
    category: "Engage",
    dependsOn: ["crm"],
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
  spark:
    "M12 3l1.800 4.700 4.700 1.800-4.700 1.800L12 16l-1.800-4.700L5.500 9.500l4.700-1.800L12 3zm7 12l.900 2.100L22 18l-2.100.900L19 21l-.900-2.100L16 18l2.100-.900L19 15z",
  ticket:
    "M4 7a2 2 0 012-2h12a2 2 0 012 2v3a2 2 0 000 4v3a2 2 0 01-2 2H6a2 2 0 01-2-2v-3a2 2 0 000-4V7zm10-2v14",
  book: "M4 5a2 2 0 012-2h13v16H6a2 2 0 00-2 2V5zm0 14a2 2 0 012-2h13",
  form: "M6 3h12a1 1 0 011 1v16a1 1 0 01-1 1H6a1 1 0 01-1-1V4a1 1 0 011-1zm3 5h6m-6 4h6m-6 4h3",
  send: "M21 3L10 14M21 3l-7 18-4-7-7-4 18-7z",
  board: "M4 4h5v16H4zM10 4h5v10h-5zM16 4h4v13h-4z",
  team: "M16 19v-1a4 4 0 00-4-4H6a4 4 0 00-4 4v1m14-8a3 3 0 100-6m6 14v-1a4 4 0 00-3-3.9M9 11a4 4 0 100-8 4 4 0 000 8z",
  clock: "M12 7v5l3 2m6-2a9 9 0 11-18 0 9 9 0 0118 0z",
  receipt: "M6 3h12v18l-3-2-3 2-3-2-3 2V3zm3 5h6m-6 4h6",
  globe:
    "M12 21a9 9 0 100-18 9 9 0 000 18zm0 0c2.5-2.5 3.5-5.5 3.5-9S14.500 5.500 12 3m0 18c-2.5-2.5-3.5-5.5-3.5-9S9.500 5.500 12 3M3.500 9h17m-17 6h17",
  report: "M4 4v16h16M8 16v-4m4 4V8m4 8v-6",
  shield: "M12 3l8 3v6c0 5-3.500 8.500-8 9-4.500-.5-8-4-8-9V6l8-3z",
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

export const ALL_ADMIN_NAV: AdminNavItem[] = [
  {
    group: "Overview",
    href: "/admin",
    label: "Dashboard",
    permission: "admin.access",
    icon: ICONS.dashboard,
  },
  {
    group: "Insights",
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
    permission: "cms.write",
    icon: ICONS.pages,
    module: "cms",
  },
  {
    group: "Content",
    href: "/admin/blog",
    label: "Blog",
    permission: "cms.write",
    icon: ICONS.blog,
    module: "cms",
  },
  {
    group: "Content",
    href: "/admin/media",
    label: "Media",
    permission: "cms.write",
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
    group: "Content",
    href: "/admin/content",
    label: "Content",
    permission: "cms.write",
    icon: ICONS.board,
    module: "cms",
  },
  {
    group: "Content",
    href: "/admin/blocks",
    label: "Reusable blocks",
    permission: "cms.write",
    icon: ICONS.puzzle,
    module: "cms",
  },
  {
    group: "Content",
    href: "/admin/review",
    label: "Review queue",
    permission: "cms.publish",
    icon: ICONS.inbox,
    module: "cms",
  },
  {
    group: "Content",
    href: "/admin/comments",
    label: "Comments",
    permission: "comments.moderate",
    icon: ICONS.chat,
    module: "cms",
  },
  {
    group: "Content",
    href: "/admin/redirects",
    label: "Redirects",
    permission: "cms.publish",
    icon: ICONS.funnel,
  },
  {
    group: "Content",
    href: "/admin/import",
    label: "Import",
    permission: "settings.manage",
    icon: ICONS.send,
    module: "cms",
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
    href: "/admin/signin",
    label: "Sign-in",
    permission: "settings.manage",
    icon: ICONS.shield,
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
    href: "/admin/content-types",
    label: "Content types",
    permission: "settings.manage",
    icon: ICONS.pages,
    module: "cms",
  },
  {
    group: "Configuration",
    href: "/admin/extensions",
    label: "Extensions",
    permission: "plugins.manage",
    icon: ICONS.puzzle,
  },
  {
    group: "Configuration",
    href: "/admin/apps",
    label: "Apps",
    permission: "plugins.manage",
    icon: ICONS.spark,
  },
  {
    group: "Configuration",
    href: "/admin/developers",
    label: "API & webhooks",
    permission: "plugins.manage",
    icon: ICONS.send,
  },
  {
    group: "Configuration",
    href: "/admin/security",
    label: "Security",
    permission: "settings.manage",
    icon: ICONS.shield,
  },
  {
    group: "Configuration",
    href: "/admin/backup",
    label: "Backup & export",
    permission: "settings.manage",
    icon: ICONS.receipt,
  },
  {
    group: "Configuration",
    href: "/admin/health",
    label: "Site health",
    permission: "settings.manage",
    icon: ICONS.report,
  },
  {
    group: "Configuration",
    href: "/admin/audit",
    label: "Audit log",
    permission: "audit.view",
    icon: ICONS.audit,
  },
  {
    group: "Customers",
    href: "/admin/assistant",
    label: "AI assistant",
    permission: "assistant.manage",
    icon: ICONS.spark,
    module: "assistant",
  },
  {
    group: "Customers",
    href: "/admin/helpdesk",
    label: "Helpdesk",
    permission: "helpdesk.work",
    icon: ICONS.ticket,
    module: "helpdesk",
  },
  {
    group: "Content",
    href: "/admin/kb",
    label: "Knowledge base",
    permission: "cms.edit",
    icon: ICONS.book,
    module: "kb",
  },
  {
    group: "Content",
    href: "/admin/translations",
    label: "Translations",
    permission: "translations.manage",
    icon: ICONS.globe,
    module: "i18n",
  },
  {
    group: "Growth",
    href: "/admin/forms",
    label: "Forms",
    permission: "forms.manage",
    icon: ICONS.form,
    module: "forms",
  },
  {
    group: "Growth",
    href: "/admin/campaigns",
    label: "Campaigns",
    permission: "campaigns.manage",
    icon: ICONS.send,
    module: "campaigns",
  },
  {
    group: "Operations",
    href: "/admin/projects",
    label: "Projects",
    permission: "projects.manage",
    icon: ICONS.board,
    module: "projects",
  },
  {
    group: "Operations",
    href: "/admin/team",
    label: "Team",
    permission: "team.manage",
    icon: ICONS.team,
    module: "team",
  },
  {
    group: "Operations",
    href: "/admin/me",
    label: "My time and leave",
    permission: "team.self",
    icon: ICONS.clock,
    module: "team",
  },
  {
    group: "Operations",
    href: "/admin/expenses",
    label: "Expenses",
    permission: "expenses.submit",
    icon: ICONS.receipt,
    module: "expenses",
  },
  {
    group: "Insights",
    href: "/admin/reports",
    label: "Reports",
    permission: "reports.view",
    icon: ICONS.report,
    module: "reports",
  },
]

// Menu order. Items are declared by module above; a business only sees what it has switched on.
export const NAV_ORDER = [
  "/admin",
  "/admin/homepage",
  "/admin/pages",
  "/admin/blog",
  "/admin/content",
  "/admin/blocks",
  "/admin/kb",
  "/admin/media",
  "/admin/translations",
  "/admin/review",
  "/admin/comments",
  "/admin/redirects",
  "/admin/import",
  "/admin/crm",
  "/admin/crm/deals",
  "/admin/assistant",
  "/admin/helpdesk",
  "/admin/support",
  "/admin/contact",
  "/admin/bookings",
  "/admin/users",
  "/admin/newsletter",
  "/admin/campaigns",
  "/admin/forms",
  "/admin/subscriptions",
  "/admin/projects",
  "/admin/team",
  "/admin/me",
  "/admin/expenses",
  "/admin/analytics",
  "/admin/reports",
  "/admin/modules",
  "/admin/content-types",
  "/admin/extensions",
  "/admin/apps",
  "/admin/developers",
  "/admin/site",
  "/admin/signin",
  "/admin/security",
  "/admin/pricing",
  "/admin/settings",
  "/admin/backup",
  "/admin/health",
  "/admin/audit",
]

/** The one menu entry for a path: the longest match on whole path segments, so children do not light up their parent too. */
export const activeNavHref = (hrefs: string[], path: string) => {
  let best: string | null = null
  for (const href of hrefs) {
    const hit =
      path === href || (href !== "/admin" && path.startsWith(`${href}/`))
    if (hit && (!best || href.length > best.length)) best = href
  }
  return best
}

export const adminNavFor = (permissions: ReadonlySet<Permission>) =>
  ALL_ADMIN_NAV.filter(
    (item) =>
      permissions.has(item.permission) &&
      (!item.module || isModuleEnabled(item.module)),
  ).sort((a, b) => NAV_ORDER.indexOf(a.href) - NAV_ORDER.indexOf(b.href))
