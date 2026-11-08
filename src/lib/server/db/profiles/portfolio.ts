import type { SeedProfile } from "./types"

// John Doe: an independent product designer and front-end developer. Minimal theme with a
// centred hero, no chat or subscriptions, the blog is the main thing, booking for intro calls.
//
// Information architecture
//   Work      /work + one page per case study
//   Writing   /blog (tags: design, design-systems, accessibility, freelancing, process, writing)
//   About     /about, /now, /uses, /colophon
//   Contact   /contact_us, /book, /newsletter
//   Legal     /privacy
const IMG = "/samples/portfolio"

export const portfolio: SeedProfile = {
  id: "portfolio",
  label: "John Doe",
  summary:
    "Individual portfolio. Minimal paper theme, case studies, about, now, uses and colophon pages, writing-first blog.",
  authorName: "John Doe",
  settings: {
    modules: {
      switches: { subscriptions: false, chat: false, assistant: true },
    },
    brand: {
      siteName: "John Doe",
      theme: "minimal",
      tagline: "Product designer and front-end developer",
      description:
        "John Doe designs and builds product interfaces for small software teams. Writing about design systems, accessibility and working alone.",
      logoUrl: `${IMG}/logo.png`,
      primaryColor: "#1c1917",
      accentColor: "#d97706",
      ogImageUrl: `${IMG}/og.png`,
    },
    navigation: {
      header: [
        { label: "Work", href: "/work" },
        { label: "Writing", href: "/blog" },
        { label: "About", href: "/about" },
        { label: "Now", href: "/now" },
      ],
      ctaLabel: "Get in touch",
      ctaHref: "/contact_us",
      footerColumns: [
        {
          title: "Work",
          links: [
            { label: "All work", href: "/work" },
            { label: "Ledgerly", href: "/work-ledgerly" },
            { label: "Fieldnote", href: "/work-fieldnote" },
            { label: "Marrow", href: "/work-marrow" },
          ],
        },
        {
          title: "About",
          links: [
            { label: "About", href: "/about" },
            { label: "Now", href: "/now" },
            { label: "Uses", href: "/uses" },
            { label: "Colophon", href: "/colophon" },
            { label: "Privacy", href: "/privacy" },
          ],
        },
        {
          title: "Elsewhere",
          links: [
            { label: "Writing", href: "/blog" },
            { label: "RSS", href: "/blog/rss.xml" },
            { label: "Newsletter", href: "/newsletter" },
            { label: "Book a call", href: "/book" },
            { label: "Contact", href: "/contact_us" },
          ],
        },
      ],
      social: [
        { platform: "github", url: "https://github.com/" },
        { platform: "linkedin", url: "https://www.linkedin.com/" },
      ],
      footerNote: "",
    },
    general: {
      supportEmail: "hi@johndoe.example",
      announcement: "",
    },
    chat: {
      enabled: false,
      greeting:
        "Hi, leave a message and I will reply when I am back at my desk.",
      offlineMessage: "",
      requireEmail: true,
      notifyAdminOnNew: true,
    },
    booking: {
      enabled: true,
      intro:
        "Thinking about working together? Tell me about the product and the team and I will say honestly whether I am a fit.",
      reminderHours: 24,
      eventTypes: [],
    },
    blog: {
      title: "Writing",
      intro:
        "Notes on product design, design systems, accessibility and working alone.",
    },
    contact: {
      notifyAdmin: true,
      successMessage:
        "Thanks. I read everything and reply within a couple of days.",
      intro:
        "Tell me about the product and the team. I read everything and reply within a couple of days.",
      topics: [
        "A product design project",
        "A design system",
        "An accessibility audit",
        "Something else",
      ],
      askPhone: false,
      askCompany: false,
      autoReply: true,
      phone: "",
      address: "",
      hours: "",
    },
    availability: {
      timezone: "Asia/Kolkata",
      weekly: [
        [],
        [],
        [{ start: "14:00", end: "18:00" }],
        [{ start: "14:00", end: "18:00" }],
        [{ start: "14:00", end: "18:00" }],
        [],
        [],
      ],
      overrides: [],
    },
    home: {
      hero: {
        eyebrow: "",
        title: "I design and build product interfaces for",
        highlight: "small software teams",
        subtitle:
          "Ten years in product design, the last four as a freelancer working directly with founders and engineers. I design in the browser and ship the front-end myself.",
        primaryCta: { label: "See my work", href: "/work" },
        secondaryCta: { label: "Read my writing", href: "/blog" },
        imageUrl: "",
      },
      stats: {
        show: false,
        items: [],
      },
      features: {
        show: true,
        title: "What I help with",
        subtitle: "",
        items: [
          {
            icon: "layers",
            title: "Product design",
            body: "From a rough idea to a working interface. Flows, screens, states and the words on them.",
          },
          {
            icon: "code",
            title: "Front-end build",
            body: "I ship the interface I designed, in Svelte or whatever the team already uses. No handoff.",
          },
          {
            icon: "pen",
            title: "Design systems",
            body: "Small, documented component sets that a two-person team can actually maintain.",
          },
          {
            icon: "check",
            title: "Accessibility",
            body: "Audits and fixes against WCAG 2.2, with the engineers, not thrown over the wall.",
          },
        ],
      },
      steps: {
        show: false,
        title: "",
        items: [],
      },
      testimonials: {
        show: true,
        title: "People I have worked with",
        items: [
          {
            quote:
              "John designed in code from the first week. We never had a handoff problem because there was no handoff.",
            name: "Jonas Weber",
            role: "Co-founder, Ledgerly",
            avatarUrl: "",
          },
          {
            quote:
              "The design system John left us is still the one we use three years later. It is small enough that we keep it up to date.",
            name: "Priya Nair",
            role: "Engineering lead, Fieldnote",
            avatarUrl: "",
          },
          {
            quote:
              "John fixed 140 accessibility issues with our engineers in six weeks and left us a checklist we still run before every release.",
            name: "Daniel Osei",
            role: "Product lead, Marrow",
            avatarUrl: "",
          },
        ],
      },
      faq: {
        show: true,
        title: "Working together",
        items: [
          {
            q: "What does an engagement look like?",
            a: "Usually two to three days a week for two to four months, embedded with the team. Shorter audits and design system work are fixed price.",
          },
          {
            q: "Do you do visual branding or marketing sites?",
            a: "No. I work on the product itself. I am happy to recommend people for brand and marketing work.",
          },
          {
            q: "Are you available?",
            a: "The now page says what I am working on and when I am next free.",
          },
          {
            q: "What do you charge?",
            a: "A day rate for embedded work and fixed prices for audits and design systems. I will tell you on the intro call; there are no surprises.",
          },
        ],
      },
      cta: {
        show: true,
        title: "Working on something?",
        subtitle:
          "Tell me about the product and the team. A short intro call costs nothing.",
        button: { label: "Book an intro call", href: "/book" },
      },
    },
  },
  eventTypes: [
    {
      name: "Intro call",
      slug: "intro-call",
      description:
        "Twenty minutes on the product, the team and whether I am a fit.",
      durationMinutes: 20,
      locationKind: "video",
      locationDetail: "I will email the video link before the call.",
      bufferBefore: 0,
      bufferAfter: 10,
      minNoticeMinutes: 1440,
      maxDaysAhead: 45,
      slotInterval: 30,
      dailyLimit: 2,
      active: true,
      questions: [
        {
          id: "product",
          label: "What are you working on?",
          kind: "textarea",
          required: true,
          options: [],
        },
        {
          id: "site",
          label: "A link to it, if there is one",
          kind: "text",
          required: false,
          options: [],
        },
      ],
    },
    {
      name: "Accessibility audit chat",
      slug: "accessibility-audit-chat",
      description:
        "Thirty minutes on what an audit would cover and how we would fix what it finds.",
      durationMinutes: 30,
      locationKind: "video",
      locationDetail: "I will email the video link before the call.",
      bufferBefore: 0,
      bufferAfter: 10,
      minNoticeMinutes: 1440,
      maxDaysAhead: 45,
      slotInterval: 30,
      dailyLimit: 1,
      active: true,
      questions: [
        {
          id: "product",
          label: "What needs auditing?",
          kind: "text",
          required: true,
          options: [],
        },
      ],
    },
  ],
  pages: [
    // --------------------------------------------------------------------- Work
    {
      slug: "work",
      title: "Work",
      seoTitle: "Selected work",
      excerpt:
        "Selected product work from the last four years: what the team needed, what I did, what shipped. Numbers are the client's.",
      md: `Selected work from the last four years. Each one is written up the same way: what the team needed, what I did, what shipped. Numbers are the client's unless I say otherwise.

## Ledgerly, 2025

Bookkeeping for freelancers. A two-founder team with a working backend and a prototype interface nobody could use. Three months, three days a week, redesigning and building the core flow. Trial to paid conversion roughly doubled in the following quarter. [Read the case study](/work-ledgerly)

## Fieldnote, 2023 to 2024

A field data app for ecologists, used offline, outdoors, on cheap phones, by people wearing gloves. A four week discovery in the field and a form system built for one hand. The 40-component design system is still the one the team uses. [Read the case study](/work-fieldnote)

## Marrow, 2022

An accessibility audit and remediation for a hospital scheduling product. Six weeks with two engineers, 140 issues fixed, and a pre-release checklist the team still runs. [Read the case study](/work-marrow)

## Earlier

Six years in-house at two product companies, mostly on settings, billing and admin screens: the unglamorous parts of a product that people use every day. Most of what I know about [settings pages](/blog/notes-on-designing-a-settings-page) and [forms](/blog/forms-people-finish) comes from those years.

[Get in touch](/contact_us) if you would like to talk about any of these in more detail.`,
    },
    {
      slug: "work-ledgerly",
      title: "Ledgerly",
      seoTitle: "Case study: Ledgerly, bookkeeping for freelancers",
      excerpt:
        "A two-founder team with a working backend and a prototype nobody could use. Three months redesigning and building the core flow, in code, with them.",
      md: `**Client:** Ledgerly, bookkeeping software for freelancers. **Team:** two founders, both engineers. **Engagement:** three months, three days a week, 2025. **Role:** product design and front-end build.

## The problem

The backend worked: bank connections, categorisation, tax calculations. The interface was a prototype the founders had built to test the backend, and it showed. Trial users connected a bank and then stopped. Nobody could say why, because nobody could get through the flow themselves without knowing where the buttons were.

## What I did

**Weeks one and two: watch people use it.** Eight trial users, recorded, thinking aloud. Every one of them got stuck in the same two places: the transaction list, which showed everything at once, and the "file a return" step, which asked for things they had already given.

**Weeks three to six: redesign the core flow in code.** Connect a bank, categorise transactions, review, file. I built it in Svelte in the founders' repository from the first week, so there was never a mockup that had to be translated.

![Ledgerly core flow](${IMG}/figure-ledgerly.png)

**Weeks seven to twelve: the rest.** Settings, billing, onboarding, empty states, errors. A twelve-component library with a written page on when to use each one.

## What shipped

The version that is still live. The transaction list shows one week at a time with the uncategorised ones first. The filing step asks only for what the system does not already know, which turned out to be two questions.

## What changed

Trial to paid conversion roughly doubled in the quarter after launch, by the founders' numbers. Support emails about "where do I" dropped to almost none.

"John designed in code from the first week. We never had a handoff problem because there was no handoff." Jonas Weber, Co-founder.

## What I would do differently

Start the user sessions in week one, not week two. I spent the first week reading the codebase, which was useful, but the sessions told me more in a day than the code did in five.`,
    },
    {
      slug: "work-fieldnote",
      title: "Fieldnote",
      seoTitle: "Case study: Fieldnote, field data forms for ecologists",
      excerpt:
        "An app used offline, outdoors, on cheap phones, by people wearing gloves. Four weeks in the field, then a form system built for one hand.",
      md: `**Client:** Fieldnote, field data collection for ecologists and conservation teams. **Team:** four engineers, one product manager. **Engagement:** six months over 2023 and 2024, two days a week. **Role:** discovery, product design, design system.

## The problem

The app was designed at a desk for people who are never at a desk. Users are in a forest or a wetland, often with one hand free, on a phone bought for the job rather than for its screen, with no signal. The existing forms were small, dense and assumed a connection.

## What I did

**A four week discovery in the field.** I went out with three teams in two countries and watched them record data. Paper won every time, because paper does not need two hands, does not need signal and does not lose your place when the battery dies.

**A form system built for those conditions.**

![Fieldnote form principles](${IMG}/figure-fieldnote.png)

- Big targets, one question per screen, so it can be used with a thumb and a glove.
- Offline first: everything is saved locally as you go and syncs when there is signal, with a clear indicator of what has and has not uploaded.
- High contrast, no hover states, no gestures that need two fingers.
- Resume later: a half-finished record is never lost, even if the phone dies.

**A design system of 40 components** with a written page per component on when to use it and when not to. Built so a team of four engineers could maintain it without a designer.

## What shipped

The form system and the design system, both still in use. Records per field day per person went up by about 40 percent in the teams that were measured, mostly because fewer were abandoned.

"The design system John left us is still the one we use three years later. It is small enough that we keep it up to date." Priya Nair, Engineering lead.

## What I learned

The best research method is going where the work is. Everything that matters about this product was obvious after one afternoon in a wetland and invisible in a year of analytics. I wrote more about small systems in [building a design system for one](/blog/a-design-system-for-one).`,
    },
    {
      slug: "work-marrow",
      title: "Marrow",
      seoTitle: "Case study: Marrow, accessibility audit and remediation",
      excerpt:
        "A hospital scheduling product that had to meet WCAG 2.1 AA for a contract. Six weeks, two engineers, 140 issues fixed, and a checklist that outlived the project.",
      md: `**Client:** Marrow, staff scheduling for hospitals. **Team:** two engineers assigned for the engagement. **Engagement:** six weeks, 2022. **Role:** accessibility audit and remediation.

## The problem

A hospital contract required WCAG 2.1 level AA. An external audit had produced a 60-page report with 140 findings, a deadline and no plan. The engineers had never done accessibility work and the report did not tell them how.

## What I did

**Week one: triage.** I grouped the 140 findings into eleven patterns. Most of the report was the same five problems repeated across screens: missing form labels, icon buttons with no name, a focus ring that had been styled away, modals that trapped nothing and announced nothing, and a colour palette with three contrast failures.

**Weeks two to five: fix the patterns, not the findings.** Each pattern was fixed once in the component library and the fix propagated. The engineers did the work; I pair-programmed, reviewed and tested with a screen reader. By week four they were finding issues I had missed.

**Week six: the checklist.** A fifteen minute pre-release checklist that catches most of what an audit would, written for engineers with no accessibility background. It is the one in [the accessibility checks I run before every launch](/blog/accessibility-checks-before-every-launch), lightly adapted.

## What shipped

All 140 findings closed and verified by the external auditor. The contract was signed. The checklist is run before every release and the team's audit findings have stayed in single digits since.

"John fixed 140 accessibility issues with our engineers in six weeks and left us a checklist we still run before every release." Daniel Osei, Product lead.

## What I learned

Fixing patterns in the component library is ten times faster than fixing findings on screens, and it is the only way the fixes survive. And engineers who have fixed an accessibility problem with a screen reader running do not create that problem again.`,
    },
    // -------------------------------------------------------------------- About
    {
      slug: "about",
      title: "About",
      seoTitle: "About John Doe",
      excerpt: "Who I am, how I work, and what I am and am not good at.",
      md: `I am John, a product designer who also writes front-end code. I have done this for ten years, the last four of them independently, working with small software teams who need someone to design the product and help build it.

## How I work

- **In the browser.** I sketch on paper, then go straight to code. Prototypes you can click are worth more than pictures of them.
- **With the team.** I sit in the engineering channel and the standup. The work is better when I know why something is hard.
- **Small and documented.** I leave behind things a two-person team can maintain: a short design system, a checklist, a page of decisions.
- **Honestly priced.** A day rate for embedded work, fixed prices for audits and systems, said out loud on the first call.

## What I am good at

Flows, forms, settings, tables, admin screens, accessibility, and the words in an interface. The everyday screens that products live or die on. The [work](/work) page has three examples and the [writing](/blog) has the thinking behind them.

## What I am not

A brand designer, an illustrator, a marketing site person, a researcher who hands over a report. I know good people for each and will introduce you.

## Before this

Six years in-house at two product companies, a payments company and a developer tools company, mostly on the settings, billing and admin screens nobody else wanted. Before that, a degree in architecture that I did not use for buildings but use every day for everything else.

## Outside work

Lisbon, two dogs, long walks, and a slow attempt at learning to throw pots. The [now](/now) page has the current version.

[Email me](/contact_us) or [book a call](/book).`,
    },
    {
      slug: "now",
      title: "Now",
      seoTitle: "What I am doing now",
      excerpt:
        "What I am working on at the moment and when I am next available. Updated every few weeks.",
      md: `What I am doing at the moment. Updated every few weeks; the idea is explained in [why I keep a now page](/blog/why-i-keep-a-now-page).

## Working on

Three days a week with a small health-tech team on their patient portal. Mostly forms and the account area, which is where I am happiest. Wrapping up at the end of next month.

## Available from

Next month, for two to three days a week, for an engagement of two to four months. Audits and design system work can fit around that. [Book a call](/book) if you want to talk about something starting then.

## Reading

A stack of books on type design that I keep promising myself I will finish, and a very good one on how hospitals schedule people, which is research for nothing in particular.

## Writing

A longer piece on [designing in code](/blog/designing-in-code-four-years-in) just went up. Next is something about tables, which are harder than they look.

## Learning

Throwing pots. Badly. Progress, such as it is, gets a line here every few weeks.`,
    },
    {
      slug: "uses",
      title: "Uses",
      seoTitle: "Tools I use",
      excerpt:
        "The tools I actually use day to day. Not sponsored, not comprehensive.",
      md: `The tools I actually use. Not sponsored, not comprehensive, and most of them could be swapped for something else without much loss.

## Design

Paper and a pencil first. Then straight to code. Figma when a client team lives there, mostly for talking rather than for designing.

## Code

Svelte and SvelteKit for most product work, or whatever the team already uses; I have shipped in React, Vue and plain HTML this year. Plain CSS with a small set of custom properties. Playwright for testing the things that break.

## Accessibility

VoiceOver on the Mac and the phone, NVDA on a Windows laptop kept for the purpose, and the browser's own accessibility tree. No paid tools; the [checklist](/blog/accessibility-checks-before-every-launch) is the tool.

## Writing

A plain text editor and this site's Markdown editor. Everything on the blog is written in it, and the site itself is described on the [colophon](/colophon) page.

## Hardware

A laptop that is older than it should be and a second monitor that is not. A cheap Android phone that stays in the drawer for testing, because that is what most people have.

## Not on the list

A task manager, a second brain, a productivity system. I have a text file called todo.`,
    },
    {
      slug: "colophon",
      title: "Colophon",
      seoTitle: "About this site",
      excerpt: "How this site is built, hosted and written.",
      md: `## Built with

This site runs on an open-source platform I did not write, with a theme I chose from its presets and colours I changed in the admin screen. I did not write a line of code for it, which was the point; the time went into the writing.

## Type

Headings are set in the system serif, which on most devices is Georgia or its nearest relative. Body text is the system sans. No web fonts are loaded, so the page does not wait for them.

## Hosting and privacy

A small server with a single database file, backed up nightly. The site counts page views without cookies and loads no third-party scripts. The [privacy](/privacy) page says the rest.

## Writing

Everything is written in Markdown in the site's own editor, usually in one sitting, then left for a day and cut by a third. Posts are dated when they were published and are not quietly edited afterwards; corrections are added at the end.

## Images

The illustrations and post covers are generated from the site's colour palette rather than bought from a stock library, so they match whatever the palette is changed to.

## Accessibility

The site is checked against the same [fifteen minute list](/blog/accessibility-checks-before-every-launch) I use for client work. If something does not work for you, [tell me](/contact_us).`,
    },
    {
      slug: "privacy",
      title: "Privacy",
      excerpt: "What this site collects, which is very little.",
      md: `- **Page views** are counted without cookies and without storing your IP address or user agent.
- **Contact form and booking** messages are kept so I can reply, and deleted when the conversation is over or when you ask.
- **Newsletter** signups are double opt-in and every email has an unsubscribe link. The list is never shared.
- **No third-party scripts** are loaded.

Questions: [contact me](/contact_us).`,
    },
  ],
  posts: [
    {
      slug: "notes-on-designing-a-settings-page",
      title: "Notes on designing a settings page",
      excerpt:
        "Settings pages are where products go to get messy. Some rules I follow to keep them usable.",
      tags: ["design", "product"],
      days: 5,
      cover: `${IMG}/cover-settings-page.png`,
      md: `Settings pages are where a product's history shows. Every feature adds a toggle, nobody removes one, and after three years you have a wall of switches no one can navigate.

Some rules I follow.

## Group by what the user is trying to do, not by where the code lives

"Notifications" is a user goal. "Integrations" is a user goal. "Advanced" is not; it is where the team put things it could not decide about.

## Every setting needs a sentence

Not a label. A sentence that says what changes when you flip it. "Send me an email when someone comments on my post" beats "Comment notifications".

## Show the current state, not the action

A toggle that reads "Enable dark mode" is ambiguous when it is on. "Dark mode: on" is not.

## Dangerous things go at the bottom, in their own section, and ask twice

Delete account, transfer ownership, reset API keys. Separate, visually quiet, and confirmed with the current password.

## Search, once there are more than about twenty

A settings search box is cheap to build and the single most used feature of a large settings area.

## Save as you go, or make saving impossible to miss

Either each change saves itself with a quiet confirmation, or there is one save bar that follows you down the page. The worst option is a save button at the bottom of a long page and no warning when you leave.

I have designed six of these now. The best one had eleven settings. The worst had ninety. [Ledgerly's](/work-ledgerly) has fourteen.`,
    },
    {
      slug: "designing-in-code-four-years-in",
      title: "Designing in code, four years in",
      excerpt:
        "I stopped making mockups in 2021. What that actually looks like day to day, what it is bad at, and why I will not go back.",
      tags: ["process", "design"],
      days: 12,
      cover: `${IMG}/cover-design-in-code.png`,
      md: `In 2021 I stopped making mockups. Not as a principle; I was on a project with two engineers and no time, and it was faster to build the screen than to draw it. Four years later I have not drawn a mockup for client work since. This is what it actually looks like.

## What a day looks like

Morning: paper. A pencil sketch of the flow, usually three or four boxes and arrows. Ten minutes.

Then the browser. I open the team's repository and build the screen with real components, real data and real states: empty, loading, error, too much. By the afternoon there is a link anyone on the team can click.

Then feedback, in the engineering channel, on the real thing. "The empty state is wrong" is a comment on a link, not a comment on a picture of a link.

## What it is good at

- **There is no handoff.** The thing I made is the thing that ships. Jonas at [Ledgerly](/work-ledgerly) put it as "we never had a handoff problem because there was no handoff."
- **States are real.** A mockup shows the happy path. Code shows what happens when the list is empty, the name is forty characters long and the request fails.
- **The constraints are real.** If the component library cannot do it, I find out in an hour, not in a review three weeks later.
- **Engineers trust it.** Design that arrives as a pull request gets reviewed like engineering, which is a compliment.

## What it is bad at

- **Exploring widely.** Ten rough directions in an afternoon is a Figma job. In code I explore two or three. I do the wide exploration on paper, which is faster than either.
- **Teams that do not share a codebase with design.** If I cannot get into the repository, I cannot do this. I ask on the first call.
- **Visual polish.** I am a product designer, not a visual one. For brand work I bring someone in.

## What I would tell a designer thinking about it

Learn the team's stack well enough to build a screen, not well enough to build the product. Pair with an engineer for the first month. Keep the paper. And expect the first project to be slower, and every one after it to be faster.`,
    },
    {
      slug: "a-year-of-freelancing-what-i-would-do-differently",
      title: "Four years of freelancing: what I would do differently",
      excerpt:
        "Mostly about money, calendars and saying no. The honest version.",
      tags: ["freelancing"],
      days: 19,
      cover: `${IMG}/cover-freelancing.png`,
      md: `I went independent four years ago. Here is what I would tell myself at the start.

## Charge by the day, not the hour

Hours make clients count minutes and make you feel guilty for thinking in the shower. Days are honest. Two or three days a week, booked in advance, is the shape that has worked.

## Keep one day a week unbooked

For writing, for learning, for the inevitable client emergency. The weeks I booked five days were the weeks nothing got better.

## Say no faster

Every project I regret, I had doubts about on the first call and took anyway. The doubts were right every time.

## Write things down in public

This blog has brought in more work than any portfolio piece. People hire the person whose thinking they have read.

## Keep a now page

It answers "are you free?" without writing the email fifty times. [Why I keep a now page](/blog/why-i-keep-a-now-page) says more.

## Put money aside on the day it arrives

Tax, slow months, the laptop that dies. A third of every invoice goes to a separate account before I look at the balance.

None of this is original. All of it took me too long.`,
    },
    {
      slug: "why-i-keep-a-now-page",
      title: "Why I keep a now page",
      excerpt:
        "A page that says what I am doing and when I am free. It answers most of the email I used to get.",
      tags: ["freelancing", "writing"],
      days: 33,
      cover: `${IMG}/cover-now-page.png`,
      md: `There is a page on this site called [now](/now). It says what I am working on, when I am next available and what I am reading. I update it every few weeks.

It started as a way to answer the "are you available?" email without writing it fifty times. It has become the page I point everyone to.

## What goes on it

- What I am working on, in one or two lines, without naming the client unless they are happy to be named.
- When I am next free. The single most useful line on the whole site.
- One or two things I am reading or thinking about, so it reads like a person wrote it.

## What does not

Anything that will be stale in a week. Anything I would be embarrassed by in a year.

## Why it works

People who are thinking about hiring you want to know if you are free and what you are like. A now page answers both in ten seconds, and it is honest in a way a portfolio is not.`,
    },
    {
      slug: "a-design-system-for-one",
      title: "Building a design system for one",
      excerpt:
        "You do not need a team to have a design system. You need twelve components and a page that explains them.",
      tags: ["design", "design-systems"],
      days: 48,
      cover: `${IMG}/cover-design-system-for-one.png`,
      md: `Design systems have a reputation for being a big-company thing: a team, a tool, a roadmap. For small products that is backwards. A small product needs a small system more than a large one does, because there is nobody to keep things consistent by hand.

## What a system for one looks like

- **Twelve components.** Button, input, select, checkbox, radio, textarea, card, table, modal, toast, tabs, empty state. That covers most of any product. Add the thirteenth when you have used the same pattern three times.
- **One page of tokens.** Colours, type sizes, spacing, radius. Custom properties in CSS, nothing fancier.
- **One page of writing.** How each component is used and, more importantly, when it is not.

## What it is not

A Figma library, a Storybook, a package. Those are fine later. At the start they are maintenance you cannot afford.

## The test

If a new engineer can build a reasonable settings page on day one without asking you anything, the system is working. The [Fieldnote](/work-fieldnote) team passed that test in 2023 and still passes it; the system has grown to about forty components in three years, which is about the right pace.`,
    },
    {
      slug: "forms-people-finish",
      title: "Forms people finish",
      excerpt:
        "Most forms are abandoned for the same six reasons. None of them are about the visual design.",
      tags: ["design", "product"],
      days: 57,
      cover: `${IMG}/cover-forms.png`,
      md: `I have watched a few hundred people fill in forms, in usability sessions and in the field. They give up for the same six reasons, and none of them are about how the form looks.

## 1. It asks for things it does not need

Every field is a reason to leave. The [Ledgerly](/work-ledgerly) filing step went from eleven questions to two by asking only for what the system did not already know. Completion went up accordingly.

## 2. It does not say why

"Phone number" loses people. "Phone number, so the courier can call if nobody answers the door" does not. One sentence under the label.

## 3. It punishes mistakes late

Validation that waits until you press submit, then paints the page red, makes people feel stupid. Validate each field when the person leaves it, in a sentence that says what to do.

## 4. It loses your place

A form that forgets everything when the phone's battery dies or the tab closes will not be started again. [Fieldnote](/work-fieldnote) saves every answer as it is given; so should everything else.

## 5. It is one giant page

One question per screen on a phone, a few related questions per screen on a desktop, and a clear sense of how far there is to go. Progress bars are fine; "step 3 of 9" is better.

## 6. The button does not say what happens

"Submit" means nothing. "Send my application" or "Book the appointment" tells the person what they are about to do, and whether they are ready to do it.

Fix those six and the form will be finished. Then make it look nice.`,
    },
    {
      slug: "accessibility-checks-before-every-launch",
      title: "The accessibility checks I run before every launch",
      excerpt:
        "Fifteen minutes, no tools you have to buy. Catches most of what an audit would.",
      tags: ["accessibility", "product"],
      days: 66,
      cover: `${IMG}/cover-accessibility-checks.png`,
      md: `Before anything I have built goes live, I run this list. It takes about fifteen minutes and catches the majority of what a formal audit would find. It came out of the [Marrow](/work-marrow) engagement, where two engineers with no accessibility background used it to keep their audit findings in single digits.

## Keyboard

1. Unplug the mouse. Tab through every screen. Can you reach everything? Can you see where you are?
2. Open every modal and menu with the keyboard. Close them with Escape.
3. Does focus go somewhere sensible after you delete something or close a dialog?

## Screen reader

4. Turn on VoiceOver or NVDA and read the page from the top. Do the headings make sense on their own?
5. Does every form field announce its label? Does every error announce itself?
6. Do icon buttons say what they do?

## Vision

7. Zoom to 200 percent. Does anything overlap or disappear?
8. Check contrast on text and on the focus ring. The ring is the one everyone forgets.
9. Turn on reduced motion. Does anything still spin?

## Content

10. Is there a visible, consistent way to undo or go back?
11. Are the error messages written for a person?

That is it. Not because the list is clever, because it is run.`,
    },
  ],
}
