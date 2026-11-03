// Site name, description and URLs live in Admin -> Brand & navigation (site_settings), not here.
export const CreateProfileStep: boolean = true

// -----------------------------------------------------------------------------
// Installed modules
// A module that is not installed is left out of the build entirely: its
// routes 404 and its code is never shipped. Installed modules can then be
// switched on and off at runtime in Admin -> Modules (no redeploy).
// See docs/ARCHITECTURE.md for the module catalogue.
// -----------------------------------------------------------------------------
export const InstalledModules = {
  cms: true, // Pages & blog
  contact: true, // Contact form + inbox
  chat: true, // Live chat widget + support inbox
  booking: true, // Calendly booking
  subscriptions: true, // Stripe plans & billing
  crm: true, // Contacts, deals pipeline, activity timeline
  newsletter: true, // Double opt-in subscribers
  analytics: true, // Cookie-free page view analytics
} as const
