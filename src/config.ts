export const WebsiteName: string = "SaaS Starter"
export const WebsiteBaseUrl: string = "https://saasstarter.work"
export const WebsiteDescription: string =
  "Open source, fast, and free to host SaaS template. Built with SvelteKit, Supabase, Stripe, Tailwind, DaisyUI, and Postgres"
export const CreateProfileStep: boolean = true

// -----------------------------------------------------------------------------
// Platform modules
// Turn whole modules on or off at build time. A disabled module's routes return
// 404, its admin pages disappear from the portal, and its client code is not
// shipped. Runtime options (greeting text, Calendly links, ...) live in
// Admin -> Settings.
// -----------------------------------------------------------------------------
export const EnabledModules = {
  subscriptions: true, // Stripe checkout, billing portal, subscription admin
  contact: true, // Contact form + admin inbox
  chat: true, // Live chat widget + support inbox
  booking: true, // Calendly booking page + bookings admin
  cms: true, // CMS pages managed from the admin portal
} as const
