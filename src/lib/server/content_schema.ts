import { z } from "zod"

// Schemas + defaults for everything a site owner edits in the admin portal:
// brand, navigation, homepage sections and pricing. Defaults make a fresh
// install look finished; every value is validated before it is stored and
// again when it is read, so a bad row can never break the public site.

const text = (max: number) => z.string().trim().max(max)
const required = (max: number) => z.string().trim().min(1, "Required").max(max)

/** Internal path ("/pricing", "/#faq"), https URL, mailto: or tel:. */
export const linkHref = z
  .string()
  .trim()
  .max(500)
  .refine(
    (v) =>
      (/^\/(?!\/)/.test(v) && !v.includes("\\")) ||
      /^https:\/\/[^\s]+$/i.test(v) ||
      /^mailto:[^\s]+$/i.test(v) ||
      /^tel:[+\d\s()-]+$/i.test(v) ||
      v.startsWith("#"),
    "Use a path like /pricing, a full https:// link, mailto: or tel:",
  )

/** Optional image: empty, a site path, or an https URL. */
export const imageUrl = z
  .string()
  .trim()
  .max(1000)
  .refine(
    (v) =>
      v === "" ||
      /^\/(?!\/)[^\s\\]*$/.test(v) ||
      /^https?:\/\/[^\s]+$/i.test(v),
    "Use an https:// image URL or upload one in Media",
  )

export const hexColor = z
  .string()
  .trim()
  .regex(/^#[0-9a-fA-F]{6}$/, "Use a 6-digit hex colour like #4f46e5")

export const ICONS = [
  "bolt",
  "shield",
  "chat",
  "calendar",
  "chart",
  "users",
  "globe",
  "sparkles",
  "heart",
  "lock",
  "rocket",
  "star",
  "clock",
  "mail",
  "card",
  "layers",
  "check",
  "search",
] as const
export type IconName = (typeof ICONS)[number]

const link = z.object({ label: required(60), href: linkHref })
const cta = z.object({ label: text(60), href: linkHref.or(z.literal("")) })

export const brandSchema = z.object({
  siteName: required(60),
  tagline: text(120),
  description: text(300),
  logoUrl: imageUrl,
  primaryColor: hexColor,
  accentColor: hexColor,
  ogImageUrl: imageUrl,
})

export const navigationSchema = z.object({
  header: z.array(link).max(8),
  ctaLabel: text(40),
  ctaHref: linkHref.or(z.literal("")),
  footerColumns: z
    .array(z.object({ title: required(40), links: z.array(link).max(8) }))
    .max(4),
  social: z
    .array(
      z.object({
        platform: z.enum([
          "x",
          "linkedin",
          "github",
          "instagram",
          "facebook",
          "youtube",
        ]),
        url: z
          .string()
          .trim()
          .url()
          .max(300)
          .refine((u) => u.startsWith("https://"), "https only"),
      }),
    )
    .max(6),
  footerNote: text(200),
})

export const homeSchema = z.object({
  hero: z.object({
    eyebrow: text(80),
    title: required(120),
    highlight: text(60),
    subtitle: text(300),
    primaryCta: cta,
    secondaryCta: cta,
    imageUrl: imageUrl,
  }),
  stats: z.object({
    show: z.boolean(),
    items: z
      .array(z.object({ value: required(20), label: required(60) }))
      .max(4),
  }),
  features: z.object({
    show: z.boolean(),
    title: text(120),
    subtitle: text(300),
    items: z
      .array(
        z.object({
          icon: z.enum(ICONS),
          title: required(80),
          body: text(300),
        }),
      )
      .max(12),
  }),
  steps: z.object({
    show: z.boolean(),
    title: text(120),
    items: z.array(z.object({ title: required(80), body: text(300) })).max(6),
  }),
  testimonials: z.object({
    show: z.boolean(),
    title: text(120),
    items: z
      .array(
        z.object({
          quote: required(500),
          name: required(80),
          role: text(120),
          avatarUrl: imageUrl,
        }),
      )
      .max(9),
  }),
  faq: z.object({
    show: z.boolean(),
    title: text(120),
    items: z.array(z.object({ q: required(200), a: required(1000) })).max(20),
  }),
  cta: z.object({
    show: z.boolean(),
    title: text(120),
    subtitle: text(300),
    button: cta,
  }),
})

export const planSchema = z.object({
  id: z
    .string()
    .trim()
    .regex(/^[a-z0-9_-]{1,40}$/, "Lowercase letters, numbers, - and _"),
  name: required(40),
  description: text(200),
  price: required(20),
  interval: text(30),
  stripePriceId: z
    .string()
    .trim()
    .regex(
      /^(price_[A-Za-z0-9]{6,})?$/,
      "Stripe price ids look like price_123…",
    ),
  stripeProductId: z
    .string()
    .trim()
    .regex(
      /^(prod_[A-Za-z0-9]{6,})?$/,
      "Stripe product ids look like prod_123…",
    ),
  features: z.array(required(120)).max(15),
  highlighted: z.boolean(),
  ctaLabel: text(40),
})
export type Plan = z.output<typeof planSchema>

export const pricingSchema = z
  .object({
    title: required(120),
    subtitle: text(300),
    plans: z.array(planSchema).min(1).max(6),
    faq: z.array(z.object({ q: required(200), a: required(1000) })).max(12),
  })
  .refine(
    (p) => new Set(p.plans.map((x) => x.id)).size === p.plans.length,
    "Each plan needs a unique id",
  )
  .refine(
    (p) => p.plans.filter((x) => x.highlighted).length <= 1,
    "Highlight at most one plan",
  )

// ---------------------------------------------------------------------------
// Defaults: a coherent, publishable demo site for "Base Suite".
// ---------------------------------------------------------------------------

export const DEFAULT_BRAND: z.output<typeof brandSchema> = {
  siteName: "Base Suite",
  tagline: "Run your website, customers and support from one place",
  description:
    "Base Suite gives small businesses a fast website with subscriptions, live chat, online booking and a content manager — all managed from one admin portal.",
  logoUrl: "",
  primaryColor: "#4f46e5",
  accentColor: "#f59e0b",
  ogImageUrl: "",
}

export const DEFAULT_NAVIGATION: z.output<typeof navigationSchema> = {
  header: [
    { label: "Features", href: "/#features" },
    { label: "Pricing", href: "/pricing" },
    { label: "Blog", href: "/blog" },
    { label: "Contact", href: "/contact_us" },
  ],
  ctaLabel: "Book a demo",
  ctaHref: "/book",
  footerColumns: [
    {
      title: "Product",
      links: [
        { label: "Features", href: "/#features" },
        { label: "Pricing", href: "/pricing" },
        { label: "Book a call", href: "/book" },
      ],
    },
    {
      title: "Company",
      links: [
        { label: "About", href: "/about" },
        { label: "Blog", href: "/blog" },
        { label: "Contact", href: "/contact_us" },
      ],
    },
  ],
  social: [],
  footerNote: "",
}

export const DEFAULT_HOME: z.output<typeof homeSchema> = {
  hero: {
    eyebrow: "All-in-one for small businesses",
    title: "Your website, customers and support —",
    highlight: "in one place",
    subtitle:
      "Publish pages and posts, take subscriptions, chat with visitors and let customers book time with you. One fast site, one admin portal.",
    primaryCta: { label: "Get started", href: "/login/sign_up" },
    secondaryCta: { label: "Book a demo", href: "/book" },
    imageUrl: "",
  },
  stats: {
    show: true,
    items: [
      { value: "100", label: "PageSpeed score out of the box" },
      { value: "5 min", label: "From sign-up to first page" },
      { value: "24/7", label: "Customers can book and reach you" },
      { value: "0", label: "Third-party scripts by default" },
    ],
  },
  features: {
    show: true,
    title: "Everything you need to run your site",
    subtitle:
      "Switch on what you need. Every module is managed from the same admin portal.",
    items: [
      {
        icon: "card",
        title: "Subscriptions",
        body: "Sell plans with Stripe Checkout. Customers manage billing themselves.",
      },
      {
        icon: "chat",
        title: "Live chat",
        body: "Talk to visitors in real time and keep every conversation in one inbox.",
      },
      {
        icon: "calendar",
        title: "Online booking",
        body: "Let customers pick a time with Calendly — bookings land in your portal.",
      },
      {
        icon: "layers",
        title: "Pages & blog",
        body: "Write in Markdown, preview, publish. SEO fields and sitemap built in.",
      },
      {
        icon: "mail",
        title: "Contact inbox",
        body: "Spam-protected contact form with statuses and internal notes.",
      },
      {
        icon: "shield",
        title: "Secure by default",
        body: "Roles, audit log, strict CSP and row-level security on every table.",
      },
    ],
  },
  steps: {
    show: true,
    title: "Live in three steps",
    items: [
      {
        title: "Make it yours",
        body: "Add your logo, colours and homepage copy from the admin portal.",
      },
      {
        title: "Add your content",
        body: "Publish pages, blog posts and pricing — no code, no redeploys.",
      },
      {
        title: "Start talking to customers",
        body: "Turn on chat and booking, and answer everything from one inbox.",
      },
    ],
  },
  testimonials: {
    show: true,
    title: "Loved by small teams",
    items: [
      {
        quote:
          "We replaced four tools with one portal. Our customers book calls and chat with us without leaving the site.",
        name: "Priya Raman",
        role: "Founder, Lotus Studio",
        avatarUrl: "",
      },
      {
        quote:
          "Fast, simple and it just works. Publishing a new page takes me two minutes.",
        name: "Daniel Okafor",
        role: "Owner, Okafor Consulting",
        avatarUrl: "",
      },
      {
        quote: "The live chat inbox alone paid for itself in the first month.",
        name: "Mei Tanaka",
        role: "Operations, Kumo Coffee",
        avatarUrl: "",
      },
    ],
  },
  faq: {
    show: true,
    title: "Frequently asked questions",
    items: [
      {
        q: "Do I need to know how to code?",
        a: "No. Everything on this site — text, pages, blog posts, pricing and colours — is edited from the admin portal.",
      },
      {
        q: "Can I use my own domain?",
        a: "Yes. Deploy to Cloudflare Pages, Vercel or any Node host and point your domain at it.",
      },
      {
        q: "Is it really free?",
        a: "The software is open source (MIT). Hosting on free tiers of Cloudflare and Supabase costs nothing to start.",
      },
    ],
  },
  cta: {
    show: true,
    title: "Ready to launch your site?",
    subtitle: "Set it up in minutes. No credit card required.",
    button: { label: "Get started free", href: "/login/sign_up" },
  },
}

export const DEFAULT_PRICING: z.output<typeof pricingSchema> = {
  title: "Simple, transparent pricing",
  subtitle: "Start free. Upgrade when you're ready.",
  plans: [
    {
      id: "free",
      name: "Starter",
      description: "For trying things out.",
      price: "$0",
      interval: "per month",
      stripePriceId: "",
      stripeProductId: "",
      features: ["Website & blog", "Contact form", "Community support"],
      highlighted: false,
      ctaLabel: "Start free",
    },
    {
      id: "pro",
      name: "Pro",
      description: "For growing businesses.",
      price: "$19",
      interval: "per month",
      stripePriceId: "",
      stripeProductId: "",
      features: [
        "Everything in Starter",
        "Live chat inbox",
        "Online booking",
        "Priority email support",
      ],
      highlighted: true,
      ctaLabel: "Go Pro",
    },
    {
      id: "business",
      name: "Business",
      description: "For teams that need more.",
      price: "$49",
      interval: "per month",
      stripePriceId: "",
      stripeProductId: "",
      features: [
        "Everything in Pro",
        "Team roles & audit log",
        "Custom domain help",
        "Phone support",
      ],
      highlighted: false,
      ctaLabel: "Contact sales",
    },
  ],
  faq: [
    {
      q: "Can I cancel anytime?",
      a: "Yes. Manage or cancel your plan from your account's billing page at any time.",
    },
    {
      q: "Do you offer refunds?",
      a: "Contact us within 14 days of purchase and we'll refund you, no questions asked.",
    },
  ],
}
