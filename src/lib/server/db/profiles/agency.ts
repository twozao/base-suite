import type { SeedProfile } from "./types"

// Northlane Studio: a two-person agency building websites and small AI tools for local businesses.
// Dark "studio" theme, every module on, fixed-price packages on /pricing with the contact form as checkout.
//
// Information architecture
//   Services  /services + one page per service
//   Work      /work + one page per case study
//   Pricing   /pricing (subscriptions module, no Stripe needed)
//   Studio    /about, /process, /faq
//   Blog      /blog (tags: ai, websites, process, case-study, guides)
//   Legal     /privacy, /terms
const IMG = "/samples/agency"

export const agency: SeedProfile = {
  id: "agency",
  label: "Northlane Studio",
  summary:
    "Small web + AI agency. Dark studio theme, services, case studies, fixed-price packages and a practical blog.",
  authorName: "Maya Northlane",
  settings: {
    modules: { switches: { assistant: true } },
    brand: {
      siteName: "Northlane Studio",
      theme: "studio",
      tagline: "Websites that work and AI that actually helps",
      description:
        "Northlane Studio builds fast websites and small, useful AI tools for local businesses. Two people, no account managers, fixed prices.",
      logoUrl: `${IMG}/logo.png`,
      primaryColor: "#8b5cf6",
      accentColor: "#a3e635",
      ogImageUrl: `${IMG}/og.png`,
    },
    navigation: {
      header: [
        { label: "Services", href: "/services" },
        { label: "Work", href: "/work" },
        { label: "Pricing", href: "/pricing" },
        { label: "Process", href: "/process" },
        { label: "Blog", href: "/blog" },
        { label: "About", href: "/about" },
      ],
      ctaLabel: "Book a call",
      ctaHref: "/book",
      footerColumns: [
        {
          title: "Services",
          links: [
            { label: "Websites", href: "/services-websites" },
            { label: "AI assistants", href: "/services-ai-assistants" },
            { label: "Automations", href: "/services-automations" },
            { label: "Care plan", href: "/services-care-plan" },
            { label: "Pricing", href: "/pricing" },
          ],
        },
        {
          title: "Work",
          links: [
            { label: "All work", href: "/work" },
            { label: "Marina Physio", href: "/work-marina-physio" },
            { label: "Kumo Coffee Roasters", href: "/work-kumo-coffee" },
            { label: "Anand Logistics", href: "/work-anand-logistics" },
          ],
        },
        {
          title: "Studio",
          links: [
            { label: "About", href: "/about" },
            { label: "Process", href: "/process" },
            { label: "FAQ", href: "/faq" },
            { label: "Blog", href: "/blog" },
            { label: "Book a call", href: "/book" },
            { label: "Contact", href: "/contact_us" },
            { label: "Privacy", href: "/privacy" },
            { label: "Terms", href: "/terms" },
          ],
        },
      ],
      social: [
        { platform: "linkedin", url: "https://www.linkedin.com/" },
        { platform: "github", url: "https://github.com/" },
        { platform: "instagram", url: "https://www.instagram.com/" },
      ],
      footerNote: "Made in Chennai and Melbourne.",
    },
    general: {
      supportEmail: "hello@northlane.example",
      announcement:
        "Taking two new website projects for January. Book a call to grab a slot.",
    },
    chat: {
      enabled: true,
      greeting:
        "Hi, Maya here. Ask about a project or pricing and I will reply within the day.",
      offlineMessage:
        "We are offline right now. Leave a message and we will get back to you tomorrow.",
      requireEmail: true,
      notifyAdminOnNew: true,
    },
    booking: {
      enabled: true,
      intro:
        "A 30 minute call to talk through what you need. No slides, no pitch, just questions and a straight answer on whether we can help and what it would cost.",
      reminderHours: 24,
      eventTypes: [],
    },
    blog: {
      title: "Blog",
      intro:
        "Practical notes on websites, AI assistants and running a small business online.",
    },
    contact: {
      notifyAdmin: true,
      successMessage:
        "Thanks. We read every message and reply within one working day.",
      intro:
        "Tell us what is slowing you down. We read every message and reply within one working day.",
      topics: [
        "A new website",
        "An AI assistant",
        "An automation",
        "The care plan",
        "Something else",
      ],
      askPhone: true,
      askCompany: true,
      autoReply: true,
      phone: "",
      address: "Chennai and Melbourne",
      hours: "Mon to Fri, 10am to 6pm IST",
    },
    availability: {
      timezone: "Asia/Kolkata",
      weekly: [
        [],
        [
          { start: "10:00", end: "13:00" },
          { start: "14:00", end: "18:00" },
        ],
        [
          { start: "10:00", end: "13:00" },
          { start: "14:00", end: "18:00" },
        ],
        [
          { start: "10:00", end: "13:00" },
          { start: "14:00", end: "18:00" },
        ],
        [
          { start: "10:00", end: "13:00" },
          { start: "14:00", end: "18:00" },
        ],
        [
          { start: "10:00", end: "13:00" },
          { start: "14:00", end: "18:00" },
        ],
        [],
      ],
      overrides: [],
    },
    home: {
      hero: {
        eyebrow: "Web + AI for local businesses",
        title: "Websites that work and AI that",
        highlight: "actually helps",
        subtitle:
          "We build fast, simple websites and small AI tools that save your team hours a week. Fixed prices, a two week build, and we stay on afterwards.",
        primaryCta: { label: "Book a call", href: "/book" },
        secondaryCta: { label: "See our work", href: "/work" },
        imageUrl: `${IMG}/hero.png`,
      },
      stats: {
        show: true,
        items: [
          { value: "64", label: "Sites launched since 2021" },
          { value: "2 weeks", label: "Typical build for a brochure site" },
          {
            value: "9 hrs",
            label: "Saved per week by our AI assistants, on average",
          },
          { value: "2", label: "People you deal with. No handoffs." },
        ],
      },
      features: {
        show: true,
        title: "What we do",
        subtitle:
          "Three things, done well. Everything else we will point you to someone better.",
        items: [
          {
            icon: "globe",
            title: "Websites",
            body: "Fast, editable sites built on this platform. You change the words and pictures yourself.",
          },
          {
            icon: "sparkles",
            title: "AI assistants",
            body: "A chat assistant trained on your documents that answers customer questions and books appointments.",
          },
          {
            icon: "bolt",
            title: "Automations",
            body: "Quotes, invoices, follow-ups and reports that write themselves from the data you already have.",
          },
          {
            icon: "chart",
            title: "Analytics that make sense",
            body: "One page that tells you where visitors come from and what they do. No cookie banner needed.",
          },
          {
            icon: "wrench",
            title: "Care plan",
            body: "Updates, backups, small changes and a human to call when something looks wrong.",
          },
          {
            icon: "users",
            title: "Training",
            body: "A one hour session with your team so nobody has to email us to change a phone number.",
          },
        ],
      },
      steps: {
        show: true,
        title: "How a project runs",
        items: [
          {
            title: "A one page brief",
            body: "We write down what the site has to do, who it is for and what done looks like. You sign it off.",
          },
          {
            title: "Build in the open",
            body: "You get a link on day two and see progress every day. Feedback goes straight into the build.",
          },
          {
            title: "Launch and hand over",
            body: "We go live, train your team and stay on a care plan if you want us around.",
          },
        ],
      },
      testimonials: {
        show: true,
        title: "What clients say",
        items: [
          {
            quote:
              "The AI assistant answers the same twenty questions we used to answer by phone. Our front desk finally gets to breathe.",
            name: "Dr. Leena Pillai",
            role: "Owner, Marina Physio",
            avatarUrl: "",
          },
          {
            quote:
              "Two weeks from first call to launch. I update the menu myself now and it takes a minute.",
            name: "Tom Becker",
            role: "Kumo Coffee Roasters",
            avatarUrl: "",
          },
          {
            quote:
              "They told us what not to build, which saved us more money than anything else that year.",
            name: "Ravi Anand",
            role: "Director, Anand Logistics",
            avatarUrl: "",
          },
        ],
      },
      faq: {
        show: true,
        title: "Questions we get asked",
        items: [
          {
            q: "How much does a website cost?",
            a: "A brochure site is a fixed $2,400 plus the care plan if you want it. Bigger builds get a fixed quote after the brief. Prices are on the pricing page.",
          },
          {
            q: "Do we own the site?",
            a: "Yes. The code, the content and the domain are yours. If you leave, we hand over everything and help you move.",
          },
          {
            q: "What does the AI assistant actually do?",
            a: "It reads your documents (prices, opening hours, policies, FAQs) and answers customer questions on your site, by email or on WhatsApp. It hands over to a human when it is unsure.",
          },
          {
            q: "Can you work with our existing site?",
            a: "Usually. We will look at it on the first call and tell you honestly whether it is worth keeping.",
          },
        ],
      },
      cta: {
        show: true,
        title: "Tell us what is slowing you down",
        subtitle:
          "A 30 minute call, no pitch. We will tell you if we can help and roughly what it costs.",
        button: { label: "Book a call", href: "/book" },
      },
    },
    pricing: {
      title: "Fixed prices, no surprises",
      subtitle:
        "Every project starts with a one page brief and a fixed quote. These are the usual shapes.",
      askAfterSignUp: false,
      plans: [
        {
          id: "launch",
          name: "Launch site",
          description:
            "A brochure site for a business that needs to be found and trusted.",
          price: "$2,400",
          interval: "one-off",
          stripePriceId: "",
          stripeProductId: "",
          features: [
            "Up to 8 pages and a blog",
            "Contact form and online booking",
            "You edit everything yourself",
            "One hour of training",
            "Live in two weeks",
          ],
          highlighted: false,
          ctaLabel: "Start a project",
        },
        {
          id: "growth",
          name: "Growth retainer",
          description:
            "For businesses that want the site to keep getting better.",
          price: "$900",
          interval: "per month",
          stripePriceId: "",
          stripeProductId: "",
          features: [
            "Care plan included",
            "Two improvement sprints a month",
            "Monthly analytics review",
            "Same-day fixes",
            "Cancel any month",
          ],
          highlighted: true,
          ctaLabel: "Talk to us",
        },
        {
          id: "assistant",
          name: "AI assistant",
          description: "A customer assistant trained on your own documents.",
          price: "$1,800",
          interval: "setup, then $120 per month",
          stripePriceId: "",
          stripeProductId: "",
          features: [
            "Answers from your documents only",
            "Books appointments",
            "Hands over to a person",
            "Website, email and WhatsApp",
            "Monthly answer review",
          ],
          highlighted: false,
          ctaLabel: "Ask about it",
        },
      ],
      faq: [
        {
          q: "Is there a contract?",
          a: "The retainer is month to month. Cancel by email and it stops at the end of the month.",
        },
        {
          q: "Do you take a deposit?",
          a: "Half up front for fixed-price work, the rest at launch.",
        },
        {
          q: "What about bigger projects?",
          a: "Anything beyond a brochure site gets a fixed quote after the one page brief. Most land between $5,000 and $15,000.",
        },
      ],
    },
  },
  eventTypes: [
    {
      name: "Discovery call",
      slug: "discovery-call",
      description:
        "Tell us what is slowing you down. We will say honestly whether we can help and roughly what it costs.",
      durationMinutes: 30,
      locationKind: "video",
      locationDetail: "We will email the video link before the call.",
      bufferBefore: 0,
      bufferAfter: 15,
      minNoticeMinutes: 240,
      maxDaysAhead: 45,
      slotInterval: 30,
      dailyLimit: 4,
      active: true,
      questions: [
        {
          id: "need",
          label: "What do you want to talk about?",
          kind: "select",
          required: true,
          options: [
            "A new website",
            "An AI assistant",
            "An automation",
            "Something else",
          ],
        },
        {
          id: "site",
          label: "Your current website, if you have one",
          kind: "text",
          required: false,
          options: [],
        },
      ],
    },
    {
      name: "AI assistant walkthrough",
      slug: "ai-assistant-walkthrough",
      description:
        "See an assistant working on real documents and find out what yours would need.",
      durationMinutes: 45,
      locationKind: "video",
      locationDetail: "We will email the video link before the call.",
      bufferBefore: 0,
      bufferAfter: 15,
      minNoticeMinutes: 1440,
      maxDaysAhead: 45,
      slotInterval: 30,
      dailyLimit: 2,
      active: true,
      questions: [
        {
          id: "questions",
          label: "What questions do you answer most often?",
          kind: "textarea",
          required: true,
          options: [],
        },
      ],
    },
    {
      name: "Website review",
      slug: "website-review",
      description:
        "Twenty minutes on your existing site. You get a plain list of what to fix first.",
      durationMinutes: 20,
      locationKind: "phone",
      locationDetail: "We will call the number you give us.",
      bufferBefore: 0,
      bufferAfter: 10,
      minNoticeMinutes: 1440,
      maxDaysAhead: 30,
      slotInterval: 30,
      dailyLimit: 3,
      active: true,
      questions: [
        {
          id: "site",
          label: "Your website address",
          kind: "text",
          required: true,
          options: [],
        },
      ],
    },
  ],
  pages: [
    // ----------------------------------------------------------------- Services
    {
      slug: "services",
      title: "Services",
      seoTitle: "Services: websites, AI assistants, automations and care",
      excerpt:
        "Three things we do, plus the care plan that keeps them running. Each one has a clear price and a clear outcome.",
      md: `We do three things. Each one has a fixed price and a clear outcome, and we will tell you on the first call which one you actually need. Most clients start with a website and add an assistant or an automation once they have seen what the site does for them.

## Websites

A fast site you can edit yourself. Pages, a blog, a contact form, online booking and a newsletter are built in, and you change the words and pictures from an admin screen without calling us. [Read more](/services-websites)

## AI assistants

A chat assistant that reads your own documents and answers customer questions on your site, by email or on WhatsApp. It only answers from what you gave it and hands over to a person when it is unsure. [Read more](/services-ai-assistants)

## Automations

Small pieces of software that do one repetitive job: turn an enquiry into a quote, chase an unpaid invoice, build the Monday report. [Read more](/services-automations)

## Care plan

Updates, backups, a monthly check and small changes, for a flat monthly fee. Most clients take it. Nobody is locked in. [Read more](/services-care-plan)

## Which one first?

| If your problem is | Start with |
| --- | --- |
| Nobody can find you, or the site looks dated | A website |
| The phone rings all day with the same questions | An AI assistant |
| Someone spends hours a week copying data between tools | An automation |
| The site exists but nobody looks after it | The care plan |

Prices are on the [pricing page](/pricing). [Book a call](/book) and we will tell you which of these fits.`,
    },
    {
      slug: "services-websites",
      title: "Websites",
      seoTitle: "Websites you can edit yourself, live in two weeks",
      excerpt:
        "A fast brochure site with a blog, contact form, booking and newsletter built in. Fixed price, two week build, you own everything.",
      md: `Most local businesses need the same things from a website: be found on search, look trustworthy, answer the obvious questions and make it easy to get in touch. We build exactly that, fast, on a platform you can edit yourself.

## What you get

- **Up to eight pages and a blog.** Home, services, about, contact and whatever else your business needs. Written with you, not for you.
- **Built in:** contact form with spam protection, online booking, newsletter signup, search, a sitemap and RSS.
- **An admin screen** where you change text, images, menus, colours and the homepage yourself. We train you for an hour and most clients never email us about content again.
- **Fast.** No third-party scripts, no cookie banner needed, pages load in under a second on a phone.
- **Yours.** Code, content, domain and hosting accounts are all in your name.

## What it costs

A brochure site is a fixed $2,400. Bigger builds (online shops, member areas, anything with custom software) get a fixed quote after the one page brief, usually between $5,000 and $15,000. See the [pricing page](/pricing).

## How long it takes

Two weeks for a brochure site, if you can give us feedback within a day. The schedule is in our [process](/process) page, and the [three week rebuild](/blog/website-rebuild-in-three-weeks-how-we-scope-it) post walks through a real one.

## After launch

The [care plan](/services-care-plan) keeps the site updated and backed up and gives you someone to call. It is optional and month to month.

## Examples

[Kumo Coffee Roasters](/work-kumo-coffee) went from first call to launch in two weeks and the owner has updated the menu fourteen times since without emailing us. [Marina Physio](/work-marina-physio) combined a site with an assistant and booking.

[Book a call](/book) to talk about yours.`,
    },
    {
      slug: "services-ai-assistants",
      title: "AI assistants",
      seoTitle: "AI assistants trained on your own documents",
      excerpt:
        "A customer assistant that answers from your documents only, books appointments and hands over to a person when unsure. On your site, email and WhatsApp.",
      md: `Every business has twenty questions it answers all day: opening hours, prices, parking, whether you take a particular insurance, whether you can do a rush job. An assistant trained on your own documents answers those, in your words, at any hour, and hands over to a person for everything else.

![How the assistant answers](${IMG}/figure-assistant.png)

## How it works

1. **You give us your documents.** Price lists, opening hours, policies, the FAQ page, the email replies you send most. Usually a day of gathering.
2. **We set the rules.** What it may answer, what it must refuse, who it hands over to and how. For a clinic that means no clinical advice, ever.
3. **It goes on your channels.** The chat widget on your site first, then email and WhatsApp if you want them.
4. **We review the answers monthly.** Every conversation is logged. Once a month we read through them with you, fix anything it got wrong and add anything it did not know.

## What it does

- Answers from your documents only. If the answer is not in there, it says so and offers a person.
- Books appointments against your calendar during the conversation.
- Collects the details a person needs to follow up, so the hand-off is clean.
- Introduces itself as an assistant and names the real person it can pass you to.

## What it does not do

It does not give medical, legal or financial advice. It does not promise things you have not written down. It does not pretend to be a person. Those rules are what make it safe to put in front of customers; we explain why in [what an AI assistant can actually do](/blog/what-an-ai-assistant-can-actually-do-for-a-small-business).

## What it costs

Setup is a fixed $1,800, then $120 a month for hosting, the monthly review and changes to the documents. See the [pricing page](/pricing).

## Is it the right first step?

Not always. If your FAQ is not written down yet, start there; it is half the job either way, and for some businesses it solves the problem on its own. We wrote about that in [chatbot or search box](/blog/chatbot-or-search-box).

## Example

[Marina Physio's](/work-marina-physio) assistant cut routine phone calls by about two thirds and now books a third of their appointments.

[Book a call](/book) to see whether yours is a fit.`,
    },
    {
      slug: "services-automations",
      title: "Automations",
      seoTitle: "Automations that remove hours of copy and paste",
      excerpt:
        "Small software that does one repetitive job: enquiry to quote, invoice chasing, the Monday report, moving data between two tools that do not talk.",
      md: `An automation is a small piece of software that does one repetitive job a person is currently doing by hand. It is not a platform, not a transformation and not a project with a steering committee. It is a thing that saves someone four hours a week, built in a week or two, for a fixed price.

## Things we have built

| Job | What happens now |
| --- | --- |
| Enquiry to quote | A web enquiry is priced from the rate card and a quote PDF goes out for approval the same day |
| Invoice chasing | Unpaid invoices get a polite reminder at 7, 14 and 21 days, and a list for a human at 28 |
| The Monday report | Sales, bookings and enquiries from three tools land in one email at 8am |
| Review requests | Customers get a review request two days after their appointment, once, with an unsubscribe |
| Form to spreadsheet to calendar | Three tools that did not talk now do, without re-keying |

## How a build runs

1. **Watch the job.** We sit with the person doing it and write down every step, including the exceptions.
2. **Build the boring version.** The one that handles 90 percent of cases and hands the rest to a person with a clear note.
3. **Run both for two weeks.** The automation and the old way side by side, until everyone trusts it.
4. **Switch over.** With a log of everything it does and a person who can stop it.

## What it costs

Most automations are a fixed $1,200 to $3,500 depending on how many tools are involved, plus the [care plan](/services-care-plan) if you want it watched. We quote after watching the job.

## Example

[Anand Logistics](/work-anand-logistics) retired a quoting spreadsheet that depended on one person and now sends quotes the same day.

[Book a call](/book) and describe the job.`,
    },
    {
      slug: "services-care-plan",
      title: "Care plan",
      seoTitle: "Website care plan: updates, backups and a person to call",
      excerpt:
        "Updates, backups, a monthly check and small changes for a flat monthly fee. Month to month, no lock-in.",
      md: `A website is software. It needs updates, it needs backups, and once in a while it needs a person who knows it to look at it. The care plan is that, for a flat monthly fee.

## What is included

- **Updates** to the platform and its dependencies, tested before they go live.
- **Daily backups** kept for 30 days, with a restore tested every quarter.
- **A monthly check**: speed, broken links, forms, booking, search ranking for your main terms.
- **Small changes**: up to two hours a month of content and layout changes you would rather not do yourself.
- **Someone to call** when something looks wrong, with a same-day reply on working days.
- **A monthly note** saying what we did and what we noticed.

## What is not included

New pages beyond the two hours, new features, redesigns and new automations. Those are quoted separately; retainer clients get them at the retainer rate.

## Cost

| Plan | Monthly | Includes |
| --- | --- | --- |
| Care plan | 180 | Everything above |
| Growth retainer | 900 | Care plan plus two improvement sprints a month and a monthly analytics review |

Both are month to month. Cancel by email and it stops at the end of the month. See the [pricing page](/pricing).

## If you do not take it

That is fine. You own the site and we hand over the hosting and backup instructions at launch. We wrote a guide to [owning your website](/blog/own-your-website-domains-hosting-and-backups) for exactly that case.

[Ask about the care plan](/contact_us).`,
    },
    // --------------------------------------------------------------------- Work
    {
      slug: "work",
      title: "Work",
      seoTitle: "Our work: case studies",
      excerpt:
        "Recent projects, written up plainly: what the client needed, what we built, and what changed afterwards. Numbers are the client's.",
      md: `A few recent projects. Each one is written the same way: what the client needed, what we built, what changed. Numbers are the client's unless we say otherwise.

## Marina Physio

**Needed:** fewer phone calls about opening hours, prices and parking, and a way to book online.

**Built:** a six page site, online booking and an AI assistant trained on the clinic's own FAQ and price list.

**Changed:** routine phone calls down by about two thirds in the first month. Online bookings are now a third of all appointments. [Read the case study](/work-marina-physio)

## Kumo Coffee Roasters

**Needed:** a site the owner could update himself, with the menu and wholesale prices changing every few weeks.

**Built:** a brochure site with a blog and newsletter, in two weeks, plus two hours of training.

**Changed:** the menu has been updated fourteen times since launch without a single email to us. [Read the case study](/work-kumo-coffee)

## Anand Logistics

**Needed:** a quoting process that did not depend on one person's spreadsheet.

**Built:** an automation that takes a web enquiry, prices it from the rate card and sends a quote PDF for approval.

**Changed:** quotes go out the same day instead of in two or three. The spreadsheet is retired. [Read the case study](/work-anand-logistics)

## Others

A tutoring centre, two cafes, a plumber, an accountant, a yoga studio, a dog groomer and about fifty more since 2021. Ask on the call and we will show you the closest match to your business.

[Book a call](/book) or [send a message](/contact_us).`,
    },
    {
      slug: "work-marina-physio",
      title: "Marina Physio",
      seoTitle: "Case study: Marina Physio, website, booking and AI assistant",
      excerpt:
        "A four-therapist clinic whose front desk spent the day on the phone. A site, online booking and an assistant trained on their own FAQ.",
      md: `**Client:** Marina Physio, a four-therapist physiotherapy clinic. **Services:** website, online booking, AI assistant, care plan. **Timeline:** three weeks for the site, two more for the assistant.

## The problem

The front desk was spending most of the day on the phone answering the same questions: opening hours, prices, parking, which insurers the clinic takes, whether a referral is needed. Booking was by phone only, so anyone who called outside hours had to call again.

## What we built

- **A six page site**: home, services, team, prices, FAQ, contact. The FAQ page was written first, from the front desk's own list of questions.
- **Online booking** through Calendly, one link per therapist, embedded on the site.
- **An AI assistant** trained on the FAQ, the price list and the insurer list, on the website chat first and WhatsApp later. It refuses anything clinical and hands over to the front desk by name.
- **A care plan** so the clinic has someone to call.

## What changed

| | Before | After, month two |
| --- | --- | --- |
| Routine phone calls a day | About 40 | About 12 |
| Bookings made online | None | About a third |
| Front desk time on the phone | Most of the day | Under two hours |

"The AI assistant answers the same twenty questions we used to answer by phone. Our front desk finally gets to breathe." Dr. Leena Pillai, Owner.

## What we got wrong

The first version of the assistant was too eager and tried to answer clinical questions. We rewrote its rules so it refuses anything medical and offers to pass the question on. The lesson, which shaped every assistant we have built since: the rules matter more than the model.

Full write-up in the blog: [case study: Marina Physio](/blog/case-study-marina-physio).

[Book a call](/book) if your business answers the same questions all day.`,
    },
    {
      slug: "work-kumo-coffee",
      title: "Kumo Coffee Roasters",
      seoTitle:
        "Case study: Kumo Coffee Roasters, a site the owner updates himself",
      excerpt:
        "A roastery and cafe whose menu and wholesale prices change every few weeks. A two week build and two hours of training.",
      md: `**Client:** Kumo Coffee Roasters, a roastery with a cafe and a wholesale business. **Services:** website, care plan. **Timeline:** two weeks.

## The problem

The old site was built by a friend in 2017 and nobody could update it. The menu was out of date, the wholesale price list was a PDF from the previous year, and Tom, the owner, had stopped sending people to the site at all.

## What we built

- **A brochure site** with the menu, the roastery story, a wholesale page with the current price list, and a blog Tom uses for new roasts.
- **A newsletter signup** in the footer and on the blog, double opt-in, with the first email going out on launch day.
- **Two hours of training** at the cafe, on Tom's own laptop, changing the menu live.

## What changed

- The menu has been updated fourteen times since launch. Tom has emailed us zero times to do it.
- The newsletter has 410 subscribers after four months, almost all from the signup on the menu page.
- Wholesale enquiries come through the form instead of by phone, with the price list already read.

"Two weeks from first call to launch. I update the menu myself now and it takes a minute." Tom Becker, Owner.

## What we left out

Online ordering. Tom asked for it on the first call; we suggested waiting until the site had proved people would use it. Six months on it is the next project, and the numbers from the newsletter justify it. That decision is the subject of [why every project starts with saying no](/blog/why-every-project-starts-with-saying-no).

[Book a call](/book) if you need a site you can run yourself.`,
    },
    {
      slug: "work-anand-logistics",
      title: "Anand Logistics",
      seoTitle: "Case study: Anand Logistics, quoting automation",
      excerpt:
        "A freight company whose quotes depended on one person and a spreadsheet. An automation that prices enquiries and sends a quote the same day.",
      md: `**Client:** Anand Logistics, a regional freight company with twelve trucks. **Services:** automation, care plan. **Timeline:** two weeks to build, two weeks running side by side.

## The problem

Every quote went through one person, Ravi's operations manager, and her spreadsheet. Enquiries came in by email and web form, she priced them from a rate card in her head and the spreadsheet, and a quote went out in two or three days. When she was on leave, quotes stopped.

## What we built

An automation that:

1. Takes an enquiry from the web form or a forwarded email.
2. Pulls out the pickup, delivery, weight and dates.
3. Prices it from the rate card, which now lives in a shared sheet the operations manager owns.
4. Builds a quote PDF and sends it to her for a one-click approval.
5. Sends the approved quote to the customer and logs it in the CRM.

Anything it cannot price (unusual cargo, multi-drop, missing details) goes to her with a note saying why.

## What changed

| | Before | After |
| --- | --- | --- |
| Time to quote | Two to three days | Same day, usually within an hour |
| Quotes that needed a human to price | All | About one in five |
| Quotes sent while the operations manager was on leave | None | All of them |

"They told us what not to build, which saved us more money than anything else that year." Ravi Anand, Director. He is referring to the customer portal we talked him out of; the automation was the thing that actually hurt.

## What it cost

A fixed $2,800 plus the care plan. It paid for itself in the first month, by Ravi's count, in quotes that went out before a competitor's.

[Book a call](/book) and describe the job that depends on one person.`,
    },
    // ------------------------------------------------------------------- Studio
    {
      slug: "about",
      title: "About",
      seoTitle: "About Northlane Studio",
      excerpt:
        "Two people, one studio, no account managers. Who we are, how we work and what we will not do.",
      md: `Northlane Studio is two people: Maya, who designs and builds websites, and Arjun, who does the AI and automation work. We started in 2021 after too many years watching small businesses pay agency prices for slow, complicated websites they could not update.

## Maya Northlane

Twelve years building websites, the first eight at agencies in Melbourne. Designs in the browser, writes most of the copy with clients, runs the training sessions. Answers the chat on this site.

## Arjun Sekar

Ten years in software, the last four in applied machine learning. Builds the assistants and automations, writes the rules that keep them safe, runs the monthly answer reviews. Based in Chennai.

## How we work

- **Fixed prices.** You know the cost before we start.
- **A one page brief.** Every project starts with one page that says what the site has to do. If we cannot write it, we are not ready to build it.
- **Build in the open.** You get a link on day two and see progress every day.
- **You own everything.** Code, content, domain, accounts.
- **We say no.** If you do not need something, we will tell you, even when it costs us the work.

The full version is on the [process](/process) page.

## Where we are

Chennai and Melbourne, which means someone is usually awake. We work with clients anywhere English is spoken and have never met half of them in person.

## What we will not do

Brand identity, print, photography, paid advertising, enterprise software. We know good people for each and will introduce you.

[Get in touch](/contact_us) or [book a call](/book).`,
    },
    {
      slug: "process",
      title: "Process",
      seoTitle: "How a project runs at Northlane Studio",
      excerpt:
        "A one page brief, a build you can watch, a launch with training, and a care plan if you want us around. Here is the whole thing.",
      md: `![How a project runs](${IMG}/figure-process.png)

## 1. The call

Thirty minutes. You tell us what is slowing you down; we ask questions and tell you honestly whether we can help and roughly what it costs. No slides. [Book one](/book).

## 2. The one page brief

If we go ahead, we write one page together:

- Who the site is for, in one or two sentences.
- What done looks like, in three to five sentences. This becomes the acceptance test.
- What stays from the old site, what merges, what goes.
- What we need from you: words, photos, logins, and a person who can decide things in a day.
- The price and the schedule.

You sign it off. We will not start without it, for the reasons in [how we scope a rebuild](/blog/website-rebuild-in-three-weeks-how-we-scope-it).

## 3. The build

**Week one:** structure and copy. You see the site's skeleton with real words by day two and we write the rest together.

**Week two:** build. Design, images, forms, booking, the admin screen. You see every change on the live link.

**Week three, if needed:** content in, testing on real phones, accessibility checks, launch.

Projects slip when feedback takes a week, not when the build does. We ask for replies within a day and we give the same.

## 4. Launch and training

We go live, usually on a Tuesday morning so there is a week to watch it. Then an hour of training with whoever will run the site, on their own laptop, making real changes.

## 5. Afterwards

The [care plan](/services-care-plan) keeps the site updated and gives you someone to call. It is optional and month to month. If you do not take it, we hand over hosting and backup instructions and you own everything.

## For assistants and automations

The same shape, with one difference: the build runs side by side with the old way for two weeks before anything switches over. Details on the [AI assistants](/services-ai-assistants) and [automations](/services-automations) pages.`,
    },
    {
      slug: "faq",
      title: "FAQ",
      seoTitle: "Frequently asked questions",
      excerpt:
        "The questions we get on most first calls, answered plainly. If yours is not here, ask on the chat.",
      md: `## Money

**How much does a website cost?** A brochure site is a fixed $2,400. Bigger builds get a fixed quote after the brief, usually between $5,000 and $15,000. The [pricing page](/pricing) has the packages.

**Do you take a deposit?** Half up front for fixed-price work, the rest at launch.

**Is there a contract?** Fixed-price work has a one page agreement. The retainer and care plan are month to month; cancel by email.

**What about hosting?** Hosting is in your name and costs you between nothing and about 20 a month depending on the host. We set it up and hand over the login.

## Ownership

**Do we own the site?** Yes. Code, content, domain, hosting and every account are yours. If you leave, we hand over everything and help you move.

**Can we edit it ourselves?** That is the point. Text, images, pages, blog, menus, colours and the homepage are all editable from the admin screen. We train you for an hour.

## The work

**How long does it take?** Two weeks for a brochure site if you can give feedback within a day. Three if there is a lot of content. The [process](/process) page has the schedule.

**Can you work with our existing site?** Usually. We will look at it on the first call and tell you honestly whether it is worth keeping.

**Do you do logos, photos or ads?** No. We know good people for each and will introduce you.

## AI

**What does the AI assistant actually do?** It reads your documents and answers customer questions on your site, email or WhatsApp, and hands over to a person when it is unsure. Details on the [AI assistants](/services-ai-assistants) page.

**Is it safe?** It only answers from what you gave it, refuses what you told it to refuse, introduces itself as an assistant and names a real person it can pass you to. Every conversation is logged and reviewed monthly.

**Do we need one?** Not always. If your FAQ is not written yet, start there. We wrote about this in [chatbot or search box](/blog/chatbot-or-search-box).

Still have a question? Use the chat, [send a message](/contact_us) or [book a call](/book).`,
    },
    // -------------------------------------------------------------------- Legal
    {
      slug: "privacy",
      title: "Privacy",
      excerpt: "What this site collects and what we do with it.",
      md: `This site collects as little as it can.

| Data | Why | Kept for |
| --- | --- | --- |
| Page views | To see which pages are used. Counted without cookies, IP addresses or user agents | Aggregated daily, never personal |
| Contact form, chat and booking messages | So we can reply | While we are talking to you; deleted on request |
| Newsletter email | To send the newsletter you asked for. Double opt-in | Until you unsubscribe |

- No third-party tracking scripts are loaded.
- We never sell or share your details.
- Client work is confidential; we only publish a case study with the client's approval.

Questions about your data: [contact us](/contact_us).`,
    },
    {
      slug: "terms",
      title: "Terms",
      excerpt: "The short version of how we work together.",
      md: `- Fixed-price work is described in a one page brief that both of us sign off. Changes to the brief are quoted separately.
- Half of a fixed price is paid up front, the rest at launch. Monthly plans are paid in advance and cancelled by email, effective at the end of the month.
- You own the code, content, domain and accounts for anything we build for you, once it is paid for.
- We may show the work in our portfolio unless you ask us not to. Case studies are only published with your approval.
- Prices on this site are in your local currency and exclude tax where applicable.
- Northlane Studio is a partnership registered in Victoria, Australia, with a presence in Chennai, India.

Questions: [contact us](/contact_us).`,
    },
  ],
  posts: [
    {
      slug: "what-an-ai-assistant-can-actually-do-for-a-small-business",
      title: "What an AI assistant can actually do for a small business",
      excerpt:
        "Not a robot receptionist. A tool that answers the same twenty questions you answer every day, and knows when to stop.",
      tags: ["ai", "guides"],
      days: 3,
      cover: `${IMG}/cover-ai-assistant.png`,
      md: `Most of what we hear about AI assistants is either hype or fear. Here is what one does for a small business when it is set up properly.

## It answers the questions you already answer

Opening hours. Prices. Parking. Whether you take a particular insurance. Whether you can do a rush job. Every business has a list of twenty questions that make up most of its inbound calls and emails. An assistant trained on your own documents answers those, in your words, at any hour.

## It only knows what you gave it

We train the assistant on your documents and nothing else. If someone asks something that is not in there, it says so and offers to pass the question to a person. That one rule is what makes it safe to put in front of customers.

## It books things

Connected to your calendar, it can offer times and book an appointment during the conversation. [Marina Physio's](/work-marina-physio) assistant books about a third of their appointments now.

## It hands over cleanly

When it passes a conversation to a person, it passes the whole conversation and the details it collected. The person does not start from "how can I help?"

## What it does not do

It does not give medical, legal or financial advice. It does not promise things you have not written down. It does not pretend to be a person; it introduces itself as an assistant and names a real person it can hand over to.

## What it costs

Setup is fixed, then a small monthly fee. Details are on the [pricing page](/pricing) and the [service page](/services-ai-assistants). If your team answers the same questions all day, it pays for itself in weeks.`,
    },
    {
      slug: "website-rebuild-in-three-weeks-how-we-scope-it",
      title: "A website rebuild in three weeks: how we scope it",
      excerpt:
        "The one page brief we write before any build, and why we will not start without it.",
      tags: ["process", "websites"],
      days: 11,
      cover: `${IMG}/cover-three-week-rebuild.png`,
      md: `Every project we take on starts with a one page brief. Not a proposal, not a deck. One page. Here is what goes on it.

## Who the site is for

One or two kinds of visitor, described plainly. "A parent looking for after-school tutoring who found us on Google." If we cannot name the visitor, we cannot design for them.

## What done looks like

Three to five sentences. "A parent can see prices, read two reviews and book a trial lesson without calling." That line becomes the acceptance test, and we read it out loud at launch.

## What stays and what goes

Most rebuilds carry too much over. We list every page on the old site and mark each one keep, merge or drop. Usually half go, and nobody misses them.

## What we need from you

Words, photos, logins, and a person who can make decisions in a day. Projects slip when feedback takes a week, not when the build does.

## The schedule

Week one: structure and copy. Week two: build, with a live link from day two. Week three: content in, testing, launch. The full version is on the [process](/process) page.

That is the whole brief. If you want to see one, [book a call](/book) and we will write yours on it.`,
    },
    {
      slug: "chatbot-or-search-box",
      title: "Chatbot or search box? Pick the boring one first",
      excerpt:
        "Half the clients who ask for a chat assistant actually need a better search and a clearer FAQ page.",
      tags: ["ai", "websites"],
      days: 24,
      cover: `${IMG}/cover-chatbot-or-search.png`,
      md: `About half the people who ask us for an AI assistant need something simpler first.

## Start with the FAQ page

If your top twenty questions are not written down anywhere, an assistant has nothing to learn from. Writing the FAQ page is the first job either way, and for a lot of businesses it fixes the problem on its own. Marina Physio's FAQ page was written before anything else and it is still the most visited page on their site.

## Then search

A visible search box that actually finds things covers the next layer. It costs nothing on the platform we build on; it is built in.

## Then the assistant

When the questions are conversational ("can you fit me in Thursday after four?") or the answer depends on who is asking, an assistant earns its place. At that point you already have the FAQ it needs to learn from.

We would rather sell you the boring thing that works than the exciting thing that does not. The [AI assistants](/services-ai-assistants) page says the same thing in more detail.`,
    },
    {
      slug: "case-study-marina-physio",
      title: "Case study: a booking site and assistant for Marina Physio",
      excerpt:
        "Fewer phone calls, more online bookings, and a front desk that gets to look up. What we built and what changed.",
      tags: ["case-study", "ai"],
      days: 38,
      cover: `${IMG}/cover-marina-physio.png`,
      md: `Marina Physio is a four-therapist clinic. Their front desk was spending most of the day on the phone answering the same questions: opening hours, prices, parking, which insurers they take.

## What we built

- A six page site: home, services, team, prices, FAQ, contact.
- Online booking through Calendly, one link per therapist.
- An AI assistant trained on the clinic's own FAQ and price list, with a hand-off to the front desk.

## What changed

Routine phone calls dropped by about two thirds within a month. Online bookings grew to roughly a third of all appointments. The front desk now spends its time on patients in the room.

## What we got wrong

The first version of the assistant was too eager and tried to answer clinical questions. We rewrote its rules so it refuses anything medical and offers to pass the question on. Worth saying: the rules matter more than the model.

## Numbers

| | Before | After, month two |
| --- | --- | --- |
| Routine calls a day | About 40 | About 12 |
| Bookings online | None | About a third |

The project page has the rest: [Marina Physio](/work-marina-physio). Want something similar? [Book a call](/book).`,
    },
    {
      slug: "why-every-project-starts-with-saying-no",
      title: "Why every project starts with saying no",
      excerpt:
        "The cheapest feature is the one you do not build. How we decide what to leave out.",
      tags: ["process"],
      days: 52,
      cover: `${IMG}/cover-saying-no.png`,
      md: `The most useful thing we do on a first call is tell people what not to build.

A members area nobody will log in to. A blog nobody has time to write. An app when a good mobile site would do. Online ordering before anyone has proved they will visit the site. These are not bad ideas; they are ideas for a later, bigger version of the business, and building them now costs money and attention the business does not have.

## The test we use

For every feature: who uses it in the first month, and what happens if it is not there? If the answer is "nobody" and "nothing", it goes on the later list. The later list is a real document and we revisit it every quarter with retainer clients.

## Two examples

[Kumo Coffee](/work-kumo-coffee) asked for online ordering on the first call. We suggested waiting until the site had proved people would use it. Six months on it is the next project, and the newsletter numbers justify it.

[Anand Logistics](/work-anand-logistics) asked for a customer portal. What was actually hurting was a quoting spreadsheet that depended on one person. We built the automation instead, for about a quarter of the cost.

## Why this is good for us too

Small, finished projects launch. Big, ambitious ones stall. We would rather launch sixty small sites that work than ten big ones that never ship.`,
    },
    {
      slug: "why-we-obsess-over-page-speed",
      title: "Why we obsess over page speed",
      excerpt:
        "Every second of load time costs you visitors. What makes a site slow, and the three things we refuse to add.",
      tags: ["websites", "guides"],
      days: 67,
      cover: `${IMG}/cover-speed.png`,
      md: `A page that loads in one second keeps more visitors than one that loads in three. That is not controversial; every study on the subject says it. What surprises clients is how easy it is to make a site slow and how little most of the slow parts do.

## What makes a site slow

- **Tracking scripts.** Analytics, pixels, heatmaps, chat widgets from six vendors. Each one is a download and most of them are never looked at.
- **Big images.** A phone photo straight from the camera is ten times larger than it needs to be.
- **Page builders.** Themes that load every feature they have on every page, in case you use one.
- **Fonts.** Four weights of two typefaces from a third-party server, blocking the page until they arrive.

## The three things we refuse to add

1. **Third-party tracking.** The platform counts page views itself, without cookies, so there is no banner and nothing to download.
2. **Chat widgets from other vendors.** The chat on our sites is a one kilobyte button; the rest loads only when someone opens it.
3. **Fonts that block the page.** System fonts or one self-hosted typeface.

## What you get instead

Every site we launch scores in the high nineties on Google's speed test on a phone, without any work after launch. The [care plan's](/services-care-plan) monthly check includes a speed test so it stays that way.

If your current site takes more than two seconds on a phone, [book a call](/book) and we will tell you why, for free, on the call.`,
    },
    {
      slug: "own-your-website-domains-hosting-and-backups",
      title: "Own your website: domains, hosting and backups explained",
      excerpt:
        "The three things every business owner should hold in their own name, and how to check that you do.",
      tags: ["guides", "websites"],
      days: 80,
      cover: `${IMG}/cover-own-your-site.png`,
      md: `We hear the same story every few months: a business wants to change its website and discovers that the domain is registered to a developer who has moved on, the hosting is on someone's personal account, and nobody has a copy of anything. Here is how to make sure that is not you.

## The domain

Your domain (the yourbusiness.com part) should be registered in your business's name, with your email as the contact, at a registrar you have the login for. Check it today: search for "whois" and your domain. If the name on the record is not yours, ask whoever set it up to transfer it, now, while they are still answering email.

## The hosting

The hosting account, where the site actually runs, should be in your name too, with billing on your card. Your developer can be given access; they should not be the owner. If you do not know where your site is hosted, ask, and ask for the login.

## The backups

Ask one question: "if the site disappeared tonight, how would we get it back, and when was that last tested?" If the answer is a pause, you do not have backups. Daily backups kept for 30 days, with a restore tested every few months, is the standard we work to on the [care plan](/services-care-plan).

## What we do at launch

Every site we build is handed over with the domain, hosting and backup logins in your name and a one page document saying where everything is. If you take the care plan we look after it; if you do not, you have everything you need to.

Not sure what you have? [Send us a message](/contact_us) and we will help you check, no charge.`,
    },
  ],
}
