import type { SeedProfile } from "./types"

// Halden Systems: a large industrial automation and energy group. Corporate theme, sales-led (no
// self-serve subscriptions), the blog is the newsroom, booking is used for discovery calls.
//
// Information architecture
//   Solutions   /solutions + one page per practice area
//   Industries  /industries + one page per sector
//   Customers   /customers (case studies)
//   Company     /about, /leadership, /history, /sustainability, /quality-and-safety
//   Careers     /careers, /early-careers
//   Investors   /investors
//   Newsroom    /blog (tags: news, engineering, sustainability, investors, careers, customer-stories, safety)
//   Legal       /privacy, /terms, /accessibility
const IMG = "/samples/enterprise"

export const enterprise: SeedProfile = {
  id: "enterprise",
  label: "Halden Systems",
  summary:
    "Large industrial enterprise. Corporate theme, solutions, industries, customers, company, careers, investors, newsroom.",
  authorName: "Halden Systems Newsroom",
  settings: {
    modules: { switches: { subscriptions: false, assistant: true } },
    brand: {
      siteName: "Halden Systems",
      theme: "corporate",
      tagline:
        "Automation and energy systems for the plants that keep the world running",
      description:
        "Halden Systems designs, builds and maintains automation, control and energy systems for manufacturing, utilities and process industries in 38 countries.",
      logoUrl: `${IMG}/logo.png`,
      primaryColor: "#1e3a5f",
      accentColor: "#c8102e",
      ogImageUrl: `${IMG}/og.png`,
    },
    navigation: {
      header: [
        { label: "Solutions", href: "/solutions" },
        { label: "Industries", href: "/industries" },
        { label: "Customers", href: "/customers" },
        { label: "Company", href: "/about" },
        { label: "Careers", href: "/careers" },
        { label: "Newsroom", href: "/blog" },
      ],
      ctaLabel: "Talk to sales",
      ctaHref: "/contact_us",
      footerColumns: [
        {
          title: "Solutions",
          links: [
            { label: "Plant automation", href: "/solutions-plant-automation" },
            {
              label: "Energy management",
              href: "/solutions-energy-management",
            },
            {
              label: "Predictive maintenance",
              href: "/solutions-predictive-maintenance",
            },
            {
              label: "Lifecycle services",
              href: "/solutions-lifecycle-services",
            },
            {
              label: "OT cyber security",
              href: "/solutions-ot-cyber-security",
            },
          ],
        },
        {
          title: "Industries",
          links: [
            { label: "Manufacturing", href: "/industries-manufacturing" },
            { label: "Utilities", href: "/industries-utilities" },
            { label: "Process industries", href: "/industries-process" },
            { label: "Customer stories", href: "/customers" },
          ],
        },
        {
          title: "Company",
          links: [
            { label: "About", href: "/about" },
            { label: "Leadership", href: "/leadership" },
            { label: "History", href: "/history" },
            { label: "Sustainability", href: "/sustainability" },
            { label: "Quality and safety", href: "/quality-and-safety" },
            { label: "Investors", href: "/investors" },
          ],
        },
        {
          title: "Work with us",
          links: [
            { label: "Careers", href: "/careers" },
            { label: "Early careers", href: "/early-careers" },
            { label: "Book a discovery call", href: "/book" },
            { label: "Contact", href: "/contact_us" },
            { label: "Privacy", href: "/privacy" },
            { label: "Terms", href: "/terms" },
            { label: "Accessibility", href: "/accessibility" },
          ],
        },
      ],
      social: [
        { platform: "linkedin", url: "https://www.linkedin.com/" },
        { platform: "youtube", url: "https://www.youtube.com/" },
      ],
      footerNote: "Halden Systems AG, Zurich.",
    },
    general: {
      supportEmail: "info@halden.example",
      announcement: "",
    },
    chat: {
      enabled: true,
      greeting:
        "Welcome to Halden Systems. Leave your question and a regional team member will reply during business hours.",
      offlineMessage:
        "Our team is offline. Leave your message and email address and we will respond on the next business day.",
      requireEmail: true,
      notifyAdminOnNew: true,
    },
    booking: {
      enabled: true,
      intro:
        "Book a call with a solutions engineer in your region. Bring a plant, a problem and your constraints; we will come back with options.",
      reminderHours: 24,
      eventTypes: [],
    },
    blog: {
      title: "Newsroom",
      intro:
        "Company news, engineering notes, customer stories and quarterly updates from Halden Systems.",
    },
    contact: {
      notifyAdmin: true,
      successMessage:
        "Thank you. A member of the regional sales team will be in touch within two business days.",
      intro:
        "Tell us about your plant or your question. A member of the regional team will reply within two business days.",
      topics: [
        "Sales enquiry",
        "Service and support",
        "OT cyber security",
        "Careers",
        "Media",
        "Investor relations",
        "Something else",
      ],
      askPhone: true,
      askCompany: true,
      autoReply: true,
      phone: "+41 44 000 00 00",
      address: "Halden Systems AG, Zurich, Switzerland",
      hours:
        "Mon to Fri, 9am to 5pm CET. 24 hour support for service contracts.",
    },
    availability: {
      timezone: "Europe/Zurich",
      weekly: [
        [],
        [
          { start: "09:00", end: "12:00" },
          { start: "13:00", end: "17:00" },
        ],
        [
          { start: "09:00", end: "12:00" },
          { start: "13:00", end: "17:00" },
        ],
        [
          { start: "09:00", end: "12:00" },
          { start: "13:00", end: "17:00" },
        ],
        [
          { start: "09:00", end: "12:00" },
          { start: "13:00", end: "17:00" },
        ],
        [
          { start: "09:00", end: "12:00" },
          { start: "13:00", end: "17:00" },
        ],
        [],
      ],
      overrides: [],
    },
    home: {
      hero: {
        eyebrow: "Industrial automation and energy",
        title: "Systems for the plants that",
        highlight: "keep the world running",
        subtitle:
          "Since 1986 Halden has designed, built and maintained the control and energy systems behind factories, utilities and process plants. 12,400 people, 38 countries, 1,900 plants under service.",
        primaryCta: { label: "Talk to sales", href: "/contact_us" },
        secondaryCta: { label: "Explore solutions", href: "/solutions" },
        imageUrl: `${IMG}/hero.png`,
      },
      stats: {
        show: true,
        items: [
          { value: "12,400", label: "People worldwide" },
          { value: "38", label: "Countries with a Halden presence" },
          { value: "1,900+", label: "Plants under lifecycle service" },
          { value: "1986", label: "Founded in Zurich" },
        ],
      },
      features: {
        show: true,
        title: "What we build",
        subtitle:
          "Five practice areas, delivered by regional teams who stay with the plant for its working life.",
        items: [
          {
            icon: "factory",
            title: "Plant automation",
            body: "Control systems, safety instrumented systems and plant-wide integration for new builds and brownfield upgrades.",
          },
          {
            icon: "plug",
            title: "Energy management",
            body: "Monitoring, load management and on-site generation that cut energy cost and reported emissions.",
          },
          {
            icon: "chart",
            title: "Predictive maintenance",
            body: "Sensor data and models that flag failing equipment weeks before it stops the line.",
          },
          {
            icon: "wrench",
            title: "Lifecycle services",
            body: "Spares, upgrades, training and 24 hour support contracts with response times in writing.",
          },
          {
            icon: "shield",
            title: "OT cyber security",
            body: "Segmentation, monitoring and incident response built for operational technology, not borrowed from IT.",
          },
          {
            icon: "globe",
            title: "Global delivery",
            body: "Engineering centres in Zurich, Pune, Monterrey and Singapore and service teams in every region we sell to.",
          },
        ],
      },
      steps: {
        show: true,
        title: "How an engagement runs",
        items: [
          {
            title: "Site assessment",
            body: "A solutions engineer walks the plant with your team and writes up constraints, risks and options.",
          },
          {
            title: "Design and build",
            body: "Fixed scope, named engineers, factory acceptance testing before anything ships to site.",
          },
          {
            title: "Commission and support",
            body: "Commissioning with your operators, then a service contract with response times in writing.",
          },
        ],
      },
      testimonials: {
        show: true,
        title: "From our customers",
        items: [
          {
            quote:
              "The predictive maintenance rollout across our 14 sites paid for itself in the first unplanned stop it prevented.",
            name: "Ingrid Solberg",
            role: "VP Operations, Nordfjord Paper",
            avatarUrl: "",
          },
          {
            quote:
              "Halden's team has been on our plant floor for eleven years. They know it better than some of our own people.",
            name: "Carlos Mendes",
            role: "Plant Director, Vale do Sol Chemicals",
            avatarUrl: "",
          },
          {
            quote:
              "The energy management system cut our reported scope 2 emissions by 18 percent in a year, with no change to output.",
            name: "Dr. Amara Okoye",
            role: "Sustainability Lead, Lagos Water",
            avatarUrl: "",
          },
        ],
      },
      faq: {
        show: true,
        title: "Common questions",
        items: [
          {
            q: "Do you work with equipment from other vendors?",
            a: "Yes. Most of the plants we serve run a mix of vendors. Our systems integrate with the major control and drive platforms and we maintain them alongside our own.",
          },
          {
            q: "What does a service contract include?",
            a: "Named engineers, response times in writing, spares holding, scheduled upgrades and 24 hour support. Contracts are shaped to the plant; see Lifecycle services or talk to your regional team.",
          },
          {
            q: "How do you handle safety-critical systems?",
            a: "Safety instrumented systems are designed and verified to IEC 61511 by certified engineers, with independent review before commissioning. See Quality and safety.",
          },
          {
            q: "Where are you based?",
            a: "Headquarters in Zurich, engineering centres in Zurich, Pune, Monterrey and Singapore, and service teams in all 38 countries where we operate.",
          },
        ],
      },
      cta: {
        show: true,
        title: "Talk to a solutions engineer in your region",
        subtitle:
          "Tell us about your plant and we will come back with options, not a sales deck.",
        button: { label: "Contact sales", href: "/contact_us" },
      },
    },
  },
  eventTypes: [
    {
      name: "Solutions discovery call",
      slug: "solutions-discovery",
      description:
        "45 minutes with a solutions engineer on your plant, your constraints and whether our systems fit.",
      durationMinutes: 45,
      locationKind: "video",
      locationDetail:
        "A meeting link is sent by your regional team before the call.",
      bufferBefore: 15,
      bufferAfter: 15,
      minNoticeMinutes: 2880,
      maxDaysAhead: 60,
      slotInterval: 30,
      dailyLimit: 4,
      active: true,
      questions: [
        {
          id: "company",
          label: "Company and site",
          kind: "text",
          required: true,
          options: [],
        },
        {
          id: "area",
          label: "Area of interest",
          kind: "select",
          required: true,
          options: [
            "Plant automation",
            "Energy management",
            "Predictive maintenance",
            "Lifecycle services",
            "OT cyber security",
          ],
        },
        {
          id: "industry",
          label: "Industry",
          kind: "select",
          required: false,
          options: [
            "Manufacturing",
            "Utilities",
            "Process industries",
            "Other",
          ],
        },
      ],
    },
    {
      name: "OT security introduction",
      slug: "ot-security-intro",
      description:
        "A 30 minute conversation on your obligations and what an assessment would involve.",
      durationMinutes: 30,
      locationKind: "video",
      locationDetail:
        "A meeting link is sent by your regional team before the call.",
      bufferBefore: 15,
      bufferAfter: 15,
      minNoticeMinutes: 2880,
      maxDaysAhead: 60,
      slotInterval: 30,
      dailyLimit: 3,
      active: true,
      questions: [
        {
          id: "company",
          label: "Company and site",
          kind: "text",
          required: true,
          options: [],
        },
        {
          id: "driver",
          label: "What prompted this?",
          kind: "textarea",
          required: false,
          options: [],
        },
      ],
    },
    {
      name: "Service contract review",
      slug: "service-contract-review",
      description:
        "For existing customers: review response levels, spares and upgrades with your service lead.",
      durationMinutes: 60,
      locationKind: "phone",
      locationDetail: "Your service lead will call the number you give us.",
      bufferBefore: 15,
      bufferAfter: 15,
      minNoticeMinutes: 2880,
      maxDaysAhead: 90,
      slotInterval: 60,
      dailyLimit: 2,
      active: true,
      questions: [
        {
          id: "plant",
          label: "Plant name",
          kind: "text",
          required: true,
          options: [],
        },
      ],
    },
  ],
  pages: [
    // ---------------------------------------------------------------- Solutions
    {
      slug: "solutions",
      title: "Solutions",
      seoTitle:
        "Solutions: automation, energy, maintenance, services and OT security",
      excerpt:
        "Five practice areas that cover a plant from the field device to the boardroom report. Most customers start with one and add others over the life of the plant.",
      md: `![Plant systems stack](${IMG}/figure-stack.png)

Halden works across five practice areas. They are designed to be bought separately and to work together: the data a predictive maintenance system collects is the same data the energy system reports on, and the same engineers service both.

## Plant automation

Control systems, safety instrumented systems, drives and plant-wide integration, for new builds and for brownfield upgrades where the line cannot stop for long. [Read more](/solutions-plant-automation)

## Energy management

Monitoring, load management and on-site generation integration. Typical first-year savings of 10 to 20 percent on energy cost, with emissions reporting in the formats regulators ask for. [Read more](/solutions-energy-management)

## Predictive maintenance

Sensors on rotating equipment and models that flag a developing fault weeks before it stops production. Alerts go to the people who can act, with the evidence attached. [Read more](/solutions-predictive-maintenance)

## Lifecycle services

Spares holding, scheduled upgrades, operator training and 24 hour support. Contracts name the engineers and put response times in writing. [Read more](/solutions-lifecycle-services)

## OT cyber security

Asset discovery, segmentation, monitoring and incident response for operational technology, built around the plant's safety case rather than borrowed from corporate IT. [Read more](/solutions-ot-cyber-security)

## Which one first?

| If your main problem is | Start with |
| --- | --- |
| Unplanned stops | Predictive maintenance |
| Energy cost or emissions reporting | Energy management |
| An ageing control system or a new line | Plant automation |
| Nobody to call when something fails | Lifecycle services |
| An audit finding or a near miss | OT cyber security |

[Book a discovery call](/book) and a solutions engineer in your region will help you decide.`,
    },
    {
      slug: "solutions-plant-automation",
      title: "Plant automation",
      seoTitle: "Plant automation: control, safety and integration",
      excerpt:
        "Control systems, safety instrumented systems, drives and plant-wide integration, designed for plants that cannot afford a long stop.",
      md: `Plant automation is where Halden started in 1986 and it is still the largest of our practice areas. We design and deliver the control layer of a plant: the controllers, the safety systems, the drives, the operator interfaces and the integration that ties them to the plant's data and business systems.

## What we deliver

- **Distributed control and PLC systems** for continuous, batch and discrete processes.
- **Safety instrumented systems** designed and verified to IEC 61511, with independent review before commissioning.
- **Drives and motion**, including energy-optimised drive selection.
- **Operator interfaces** designed with the operators who will use them, following the ISA-101 guidance on high-performance HMI.
- **Integration** with historians, MES, maintenance and ERP systems, so the control layer feeds the plant's reporting without manual re-keying.

## Brownfield is our speciality

Most of our automation work is on plants that are already running. The usual constraint is a maintenance window of a few days, sometimes hours. We plan the cutover around that window, build and test the new system off site, and keep a tested rollback path until the plant has run a full cycle on the new system.

## How a project runs

![How an engagement runs](${IMG}/figure-engagement.png)

1. **Site assessment.** A solutions engineer walks the plant with your operations and maintenance leads and writes up constraints, risks and options. You get the write-up whether or not you go further.
2. **Design.** Functional design specification agreed with your team, with a fixed scope and named engineers.
3. **Build and factory acceptance test.** The system is built and tested at one of our engineering centres against the agreed specification, with your engineers present.
4. **Site acceptance and commissioning.** Done with your operators, in your maintenance window, with a rollback plan.
5. **Handover.** Documentation, training and a service contract if you want one.

## Multi-vendor by default

Almost every plant we work on runs a mix of vendors. We design for that, integrate with the major control and drive platforms, and maintain third-party equipment alongside our own under [lifecycle services](/solutions-lifecycle-services).

[Talk to sales](/contact_us) or [book a discovery call](/book).`,
    },
    {
      slug: "solutions-energy-management",
      title: "Energy management",
      seoTitle: "Energy management for industrial plants",
      excerpt:
        "Measure, manage and report plant energy. Typical first-year savings of 10 to 20 percent, with reporting that satisfies auditors and regulators.",
      md: `Energy is usually the second or third largest cost in a plant and the one with the least visibility. Our energy management practice gives plant teams the measurement to see where it goes, the controls to do something about it, and the reporting their auditors ask for.

## What we deliver

- **Metering and monitoring** down to the line or major asset, with data in the same historian as the control system.
- **Load management**: peak shaving, scheduling of energy-intensive steps and demand response where the local grid offers it.
- **On-site generation integration**: solar, combined heat and power and battery storage, controlled together with the plant load.
- **Reporting** aligned to ISO 50001 and to scope 1 and 2 reporting frameworks, in the formats your auditors and regulators ask for.

## What customers typically see

| Measure | Typical first-year result |
| --- | --- |
| Energy cost | 10 to 20 percent reduction |
| Reported scope 2 emissions | Follows energy use; 18 percent at Lagos Water |
| Time to produce the annual energy report | Days instead of weeks |

Results depend on the plant. The site assessment gives you an estimate for yours before you commit.

## Why it is part of the automation practice

The cheapest energy saving is usually a control change: a pump that runs at the right speed, a compressor that does not idle, a furnace that preheats on a schedule instead of all night. Because our energy engineers sit with the control engineers, those changes are made in the control system rather than bolted on beside it.

## Reporting that holds up

Our reporting is built to be audited. Every number traces back to a meter, a calculation and a time window, and the report marks what is measured and what is estimated. The approach is described in [how we audit supplier emissions](/blog/how-we-audit-supplier-emissions), which uses the same principle for our own reporting.

[Talk to sales](/contact_us) about an energy assessment.`,
    },
    {
      slug: "solutions-predictive-maintenance",
      title: "Predictive maintenance",
      seoTitle: "Predictive maintenance for rotating equipment",
      excerpt:
        "Sensors, models and alerts that flag a developing fault weeks before it stops the line. Rolled out across more than 400 plants.",
      md: `Unplanned downtime is the most expensive thing that happens in a plant. Predictive maintenance replaces "run until it fails" with "fix it in the next planned window", by watching rotating equipment for the early signs of a fault.

## How it works

1. **Sensors** for vibration, temperature and motor current are fitted to the equipment that matters: pumps, fans, compressors, gearboxes, refiners, conveyors.
2. **Data** flows into the same plant historian the control system uses, so there is one source of truth.
3. **Models** trained on that equipment's own behaviour flag changes that match a developing fault.
4. **Alerts** go to the named owner of that asset, with the evidence attached: the trend, the likely cause, the recommended action and the time you probably have.

## What we learned from 400 plants

We have rolled this out at over 400 plants and wrote up the three biggest lessons after a [40-site programme for a pulp and paper customer](/blog/predictive-maintenance-across-40-sites-three-lessons). In short: alerts need a named owner, start with the equipment that has stopped the line before, and models are local to the plant.

## Results

| Across monitored equipment | Typical |
| --- | --- |
| Unplanned stops | Reduced by a third to a half |
| Time from alert to failure | Two to six weeks |
| Payback | Usually the first prevented stop |

## Commercial model

Predictive maintenance is sold as a service: sensors and installation, then a monthly fee per monitored asset that covers the platform, model upkeep and a monthly review with a Halden reliability engineer. It is usually bundled into a [lifecycle services](/solutions-lifecycle-services) contract.

[Book a discovery call](/book) to scope a pilot on your worst five assets.`,
    },
    {
      slug: "solutions-lifecycle-services",
      title: "Lifecycle services",
      seoTitle: "Lifecycle services and support contracts",
      excerpt:
        "Spares, upgrades, training and 24 hour support for the working life of the plant. Named engineers and response times in writing.",
      md: `A control system runs for 15 to 25 years. The people who built it move on, the vendor's product line changes, and the plant around it keeps evolving. Lifecycle services is the practice that keeps the system supported, current and secure for all of that time, whether or not Halden built it.

## What a contract includes

- **Named engineers** who know the plant. Our average service engineer has been on their plant for seven years.
- **Response times in writing.** Not targets, commitments, with remedies if we miss them.
- **24 hour support** by phone and secure remote access, with on-site attendance by agreed deadlines.
- **Spares holding** either on site or at the nearest Halden depot, with obsolescence tracking.
- **Scheduled upgrades** planned around your maintenance windows, including firmware, security patches and operating system lifecycles.
- **Operator and maintenance training** on site, refreshed as people change.
- **An annual system health review** with a written report.

## Service levels

| Level | Response | Attendance | Typical plant |
| --- | --- | --- | --- |
| Standard | 4 hours, business hours | Next business day | Single shift, planned stops |
| Extended | 2 hours, 24/7 | Within 24 hours | Multi-shift manufacturing |
| Critical | 30 minutes, 24/7 | Within 8 hours | Continuous process, utilities |

Levels are a starting point; most contracts are shaped to the plant.

## Third-party equipment

We maintain control and drive equipment from the major vendors under the same contract. You get one number to call.

## Remote access, done properly

Remote support is time-limited, logged and approved per session by the plant, with the controls described under [OT cyber security](/solutions-ot-cyber-security). Our own access is governed by the same rules we recommend to customers.

[Talk to sales](/contact_us) about a service contract for your plant.`,
    },
    {
      slug: "solutions-ot-cyber-security",
      title: "OT cyber security",
      seoTitle: "OT cyber security for industrial plants",
      excerpt:
        "Asset discovery, segmentation, monitoring and incident response for operational technology, built around the plant's safety case.",
      md: `Plant networks used to be protected mostly by being separate. That is no longer true. Remote support, cloud reporting and vendor access have connected operational technology to the outside world, and regulation such as the NIS2 directive now holds plant operators responsible for securing it.

Our OT security practice is run by control engineers who also hold security qualifications. The difference matters: a measure that would be routine in corporate IT, like patching on a Tuesday, can trip a plant.

## Services

- **Assessment.** A site assessment against IEC 62443 that starts with what is actually on the network. Most plants we assess have 20 to 30 percent more connected devices than their asset list says.
- **Segmentation.** Zones and conduits designed around the process and the safety case, so the office network and the plant network only meet at points you monitor.
- **Vendor access control.** Time-limited, logged, per-session approval for every vendor, Halden included.
- **Monitoring.** Passive monitoring of plant traffic that flags new devices, new conversations and known attack patterns without touching the control system.
- **Incident response.** A plan agreed with the plant: who shuts what down, in what order, and how the plant runs manually for a shift. Rehearsed annually.

## Regulation

| Framework | How we help |
| --- | --- |
| IEC 62443 | Assessments, zone and conduit design, secure development of our own products |
| NIS2 (EU) | Gap analysis, risk management measures, incident reporting readiness |
| National utility regulations | Country-specific teams hold the relevant certifications |

## Start with the list

If you do one thing this quarter, read [OT cyber security: what changed this year](/blog/ot-cyber-security-what-changed-this-year) and work through the four-item list at the end. Then [talk to sales](/contact_us) about an assessment.`,
    },
    // --------------------------------------------------------------- Industries
    {
      slug: "industries",
      title: "Industries",
      seoTitle: "Industries we serve",
      excerpt:
        "Manufacturing, utilities and process industries. The problems differ, the engineering discipline is the same.",
      md: `Halden serves three broad sectors. Each has its own regulatory environment, its own failure modes and its own idea of what a short stop is. The sector pages describe how our practice areas apply in each.

## Manufacturing

Discrete and batch manufacturing: automotive, electronics, food and beverage, packaging, pharmaceuticals. Lines that cannot stop for an upgrade and energy bills that are the second line on the P&L. [Read more](/industries-manufacturing)

## Utilities

Water, wastewater and power distribution. Long-lived assets, strict regulation, a growing cyber security obligation and the public as the customer. [Read more](/industries-utilities)

## Process industries

Chemicals, pulp and paper, metals and cement. Continuous processes where a stop costs hours to recover from and safety instrumented systems do the heavy lifting. [Read more](/industries-process)

## Customers

Read what customers in each sector say about the work on the [customer stories](/customers) page.`,
    },
    {
      slug: "industries-manufacturing",
      title: "Manufacturing",
      seoTitle: "Automation and energy for manufacturing plants",
      excerpt:
        "Brownfield upgrades in planned windows, energy on the P&L, and predictive maintenance where a stopped line costs the most.",
      md: `Manufacturing plants are where our brownfield discipline was learned. A line that runs three shifts has a maintenance window measured in hours, and everything we do is planned around it.

## What manufacturers come to us for

- **Line upgrades without a long stop.** New controllers, drives and operator interfaces, built and tested off site, cut over in a planned window with a rollback path. See [plant automation](/solutions-plant-automation).
- **Energy as a line on the P&L.** Metering to the line, compressed air and HVAC control, and scheduling of energy-intensive steps. See [energy management](/solutions-energy-management).
- **Predictive maintenance on the assets that stop the line.** Conveyors, compressors, presses and packaging machines. See [predictive maintenance](/solutions-predictive-maintenance).
- **Traceability.** Integration between the control layer and MES or ERP so batch and serial records are captured automatically.

## Sub-sectors

| Sector | Typical work |
| --- | --- |
| Automotive and tier suppliers | Body shop and paint shop control, drive upgrades, energy in paint and press shops |
| Food and beverage | Batch control, clean-in-place automation, refrigeration energy |
| Pharmaceuticals | Validated batch systems, audit trails, data integrity |
| Electronics and packaging | High-speed line integration, predictive maintenance on handling equipment |

## A customer's view

A packaging manufacturer with no tolerance for a mid-week stop put it simply after three line upgrades: "Every upgrade since you started has gone in over a weekend. The previous vendor needed a week." Read more on the [customer stories](/customers) page.

[Talk to sales](/contact_us) about your plant.`,
    },
    {
      slug: "industries-utilities",
      title: "Utilities",
      seoTitle: "Automation and security for water and power utilities",
      excerpt:
        "Water, wastewater and power distribution. Long-lived assets, strict regulation and a cyber security obligation that grows every year.",
      md: `Utilities run the longest-lived control systems we see, some over 25 years old, serving the public under regulation that varies by country. Our utilities teams are organised by country for that reason and hold the local certifications.

## What utilities come to us for

- **Telemetry and SCADA modernisation** for networks of remote sites, with migration plans that keep the old and new systems running side by side.
- **Energy management** for pumping and treatment, usually the largest controllable cost a water utility has. Lagos Water cut reported scope 2 emissions by 18 percent in a year.
- **OT cyber security** to meet national regulation and the NIS2 directive in the EU: asset discovery, segmentation, vendor access control and monitoring. See [OT cyber security](/solutions-ot-cyber-security).
- **Lifecycle services** with critical-level response for treatment works and distribution control centres.

## Regulation

| Region | What we hold |
| --- | --- |
| European Union | NIS2 readiness assessments, IEC 62443 certified engineers |
| United Kingdom | NIS Regulations and CAF assessment experience |
| India | CEA cyber security regulations for power utilities |
| Latin America | Country-specific utility certifications through the Monterrey centre |

## Working in public

Utilities answer to regulators and to the public. Our documentation and reporting are written to be read by both, and our incident response plans are built to be exercised with the utility's own emergency planning.

[Talk to sales](/contact_us) or read the [Lagos Water story](/customers).`,
    },
    {
      slug: "industries-process",
      title: "Process industries",
      seoTitle: "Automation for chemicals, pulp and paper, metals and cement",
      excerpt:
        "Continuous processes where a stop costs hours to recover from. Safety instrumented systems, advanced control and predictive maintenance do most of the work.",
      md: `In a continuous process plant, a trip is not a pause; it is hours of recovery, off-spec product and sometimes a safety event. Our process industries practice is built around keeping the plant inside its envelope and catching problems before they become trips.

## What process plants come to us for

- **Safety instrumented systems** designed, verified and maintained to IEC 61511 by certified engineers, with independent review. See [quality and safety](/quality-and-safety).
- **Advanced process control** that holds the process closer to its limits with less operator intervention.
- **Predictive maintenance** on refiners, pumps, fans, kilns and mills, the equipment that causes the longest recoveries. See the [40-site programme](/blog/predictive-maintenance-across-40-sites-three-lessons).
- **Energy management** in the most energy-intensive sector we serve, with reporting that stands up to audit.

## Sectors

| Sector | Typical work |
| --- | --- |
| Chemicals | Safety systems, batch and continuous control, alarm management |
| Pulp and paper | Refiner and dryer control, predictive maintenance fleet programmes |
| Metals | Furnace and rolling mill control, energy management |
| Cement | Kiln and mill control, emissions monitoring |

## Long relationships

Our longest-standing customer, Vale do Sol Chemicals, has had Halden engineers on site for eleven years. In this sector the people who know the plant are the asset, and our contracts are built to keep them there. Read Carlos Mendes's account on the [customer stories](/customers) page.

[Book a discovery call](/book).`,
    },
    // ---------------------------------------------------------------- Customers
    {
      slug: "customers",
      title: "Customer stories",
      seoTitle: "Customer stories",
      excerpt:
        "What customers in manufacturing, utilities and process industries needed, what was built, and what changed. Written with them and checked by them.",
      md: `Each story below was written with the customer and checked by them before publication. Numbers are theirs unless marked as ours.

## Nordfjord Paper: predictive maintenance across 14 mills

**Sector:** Pulp and paper. **Practice areas:** Predictive maintenance, lifecycle services.

Nordfjord runs 14 mills across Norway, Sweden and Finland. Unplanned stops on refiners and dryer sections were the largest single cause of lost production. Over two years Halden fitted sensors to around 900 assets and rolled out predictive maintenance mill by mill, starting with the equipment that had stopped each mill before.

**Result:** unplanned stops on monitored equipment fell by a little under half. "It paid for itself in the first unplanned stop it prevented," says Ingrid Solberg, VP Operations. The programme is written up in detail in the newsroom: [three lessons from rolling out predictive maintenance across 40 sites](/blog/predictive-maintenance-across-40-sites-three-lessons) and the [customer story](/blog/customer-story-nordfjord-paper).

## Lagos Water: energy management at scale

**Sector:** Utilities. **Practice areas:** Energy management, OT cyber security.

Pumping is the largest controllable cost for a water utility. Lagos Water asked for visibility first and savings second. Halden metered 60 pumping stations and treatment works, brought the data into one system and tuned pump scheduling against tariff periods.

**Result:** reported scope 2 emissions down 18 percent in the first year with no change in output, and an annual energy report that takes days to produce instead of weeks. "The reporting is what convinced our board," says Dr. Amara Okoye, Sustainability Lead.

## Vale do Sol Chemicals: eleven years on site

**Sector:** Chemicals. **Practice areas:** Plant automation, lifecycle services.

Vale do Sol has had Halden engineers on site since a control system replacement eleven years ago. Since then the relationship has covered two safety system upgrades, a migration of the operator interfaces and an OT security assessment, all under one service contract.

**Result:** no unplanned stop attributable to the control system in the last six years. "They know it better than some of our own people," says Carlos Mendes, Plant Director.

## A packaging manufacturer: upgrades over a weekend

**Sector:** Manufacturing. **Practice areas:** Plant automation.

A high-speed packaging plant with no tolerance for a mid-week stop. Three line upgrades, each built and tested at the Pune engineering centre, each cut over between Friday night and Monday morning with a rollback path that was never needed.

**Result:** "Every upgrade since you started has gone in over a weekend. The previous vendor needed a week."

[Talk to sales](/contact_us) about your plant.`,
    },
    // ------------------------------------------------------------------ Company
    {
      slug: "about",
      title: "About Halden",
      seoTitle: "About Halden Systems",
      excerpt:
        "Founded in Zurich in 1986. 12,400 people in 38 countries, one job: keep plants running safely, efficiently and securely for their whole working life.",
      md: `Halden Systems was founded in Zurich in 1986 by two control engineers who believed a plant should be able to call the people who built its systems for as long as those systems ran. Nearly forty years later that is still the business model: build it well, then stay.

## Halden today

- **12,400 people** in 38 countries.
- **Four engineering centres**: Zurich, Pune, Monterrey and Singapore.
- **Service teams in every region we sell to**, because a support contract is only worth what the response time says.
- **1,900 plants** under lifecycle service contracts.
- Owned by its founders' foundation and employees; see [investors](/investors).

![Where we work](${IMG}/figure-regions.png)

## How we work

- **Named engineers.** Every contract names the people responsible.
- **Response times in writing.** Commitments, with remedies, not targets.
- **Safety first, always.** Safety-critical work is designed and independently verified by certified engineers. See [quality and safety](/quality-and-safety).
- **Long relationships.** Our average customer has been with us for 14 years.
- **Honest reporting.** Our own sustainability numbers mark what is measured and what is estimated. See [sustainability](/sustainability).

## More about the company

- [Leadership](/leadership)
- [History](/history)
- [Sustainability](/sustainability)
- [Quality and safety](/quality-and-safety)
- [Careers](/careers)
- [Investors](/investors)

For media enquiries, contact the newsroom through the [contact page](/contact_us).`,
    },
    {
      slug: "leadership",
      title: "Leadership",
      seoTitle: "Leadership team",
      excerpt:
        "The executive team and the board. Most of the executive team started as engineers on plant floors.",
      md: `## Executive team

| Name | Role | Background |
| --- | --- | --- |
| Elin Haldorsen | Chief Executive | Joined Halden in 1998 as a commissioning engineer. Ran the Nordic region and then global services before becoming CEO in 2019. |
| Rajesh Iyer | Chief Technology Officer | Founded the Pune engineering centre in 2004. Responsible for product engineering, predictive maintenance and OT security. |
| Marta Keller | Chief Financial Officer | Joined from an industrial group in 2016. Leads finance, risk and the annual report. |
| Luis Herrera | President, Americas | Joined through the Monterrey centre in 2009. Responsible for sales and delivery across North and South America. |
| Mei Lin Tan | President, Asia Pacific | Built the Singapore centre's utilities practice. Responsible for the region since 2021. |
| Jonas Bruhn | Chief Operating Officer | Thirty years in plant automation delivery, the last twelve running global delivery and quality. |
| Dr. Fatima Al-Rashid | Chief Sustainability Officer | Led the three-year scope 3 programme described in the newsroom. Responsible for sustainability reporting and the energy practice's methodology. |

## Board of directors

The board has seven members: the Chief Executive, two representatives of the founders' foundation, one employee representative and three independent directors with backgrounds in industrial engineering, utilities regulation and finance. The chair is independent. Board biographies, committee membership and the governance report are published in the annual report; see [investors](/investors).

## Contact

Executive and board members are not reachable through this site. Media enquiries go to the newsroom via the [contact page](/contact_us).`,
    },
    {
      slug: "history",
      title: "History",
      seoTitle: "Halden Systems history, 1986 to today",
      excerpt:
        "From a two-person control engineering office in Zurich to 12,400 people in 38 countries, without changing the founding idea.",
      md: `## 1986: Zurich

Two control engineers, Peter Halden and Anna Reuss, leave a large automation vendor to start a firm with one rule: the engineers who build a system stay available for its working life. The first customer is a paper mill in eastern Switzerland. It is still a customer.

## 1990s: the service model

The company grows across Switzerland, Germany and the Nordics on plant automation projects. In 1994 it signs its first formal lifecycle service contract, with named engineers and response times in writing, which becomes the template for every contract since.

## 2004: Pune

Halden opens its first engineering centre outside Europe in Pune, India, under Rajesh Iyer. The centre starts with software for operator interfaces and grows into the group's largest engineering site.

## 2009: Monterrey

The Monterrey centre opens to serve the automotive and manufacturing customers following their supply chains to Mexico. It becomes the base for the Americas region.

## 2012: Singapore and utilities

The Singapore centre opens with a focus on utilities across Southeast Asia and Australia. The utilities practice, with its country-by-country regulatory teams, takes shape here.

## 2016: predictive maintenance

The first predictive maintenance pilots run on customer equipment in Sweden and India. By 2020 it is a practice area; today it is deployed at over 400 plants.

## 2019: a new chief executive

Elin Haldorsen, who joined as a commissioning engineer in 1998, becomes Chief Executive. The founders step back to the foundation board.

## 2021: OT cyber security

The OT security practice is formed from the control engineers who had been doing the work informally, in response to customer demand and the arrival of regulation.

## Today

12,400 people, 38 countries, 1,900 plants under service, and the same rule from 1986. Read about where we are going on the [sustainability](/sustainability) and [careers](/careers) pages.`,
    },
    {
      slug: "sustainability",
      title: "Sustainability",
      seoTitle: "Sustainability at Halden Systems",
      excerpt:
        "Our largest contribution is in our customers' plants. Our own footprint is reported honestly, with measured and estimated numbers marked.",
      md: `Halden's largest effect on emissions is not in our own operations. It is in the 1,900 plants we help run. An energy management system that cuts a plant's energy use by 15 percent does more than anything we could do to our offices. That shapes how we think about sustainability: the practice areas come first, and our own footprint is reported honestly alongside them.

## In our customers' plants

- Energy management deployed at over 300 plants, with typical first-year energy reductions of 10 to 20 percent.
- Predictive maintenance reduces scrap and off-spec product by preventing unplanned stops.
- Energy-optimised drive selection is standard in every automation project.

We report the aggregate energy reduction across customer plants where we have the metering to measure it, and we mark it as customer-reported.

## Our own footprint

| Scope | Approach | Status |
| --- | --- | --- |
| Scope 1 | Fleet and buildings, measured | Down 31 percent since 2019 |
| Scope 2 | Electricity, measured, market-based | 100 percent renewable at engineering centres since 2023 |
| Scope 3 | Supplier emissions, 70 percent of spend measured, remainder estimated | Reported since last year, see below |

Getting scope 3 to a number we would put our name to took three years. The newsroom explains [how we audit supplier emissions](/blog/how-we-audit-supplier-emissions) and why the honest version is more useful than a clean one.

## Targets

- Scope 1 and 2: net zero by 2035, with interim targets in the annual report.
- Scope 3: measured coverage of 90 percent of spend by 2028.
- Customer plants: continue to report aggregate reductions annually.

## People and safety

Sustainability includes the people who do the work. Our safety record and the quality system behind it are on the [quality and safety](/quality-and-safety) page; our approach to hiring and development is on the [careers](/careers) page.

The full sustainability report is part of the annual report; see [investors](/investors).`,
    },
    {
      slug: "quality-and-safety",
      title: "Quality and safety",
      seoTitle: "Quality system and safety record",
      excerpt:
        "Certified engineers, independent review of safety-critical work, and a safety record we publish every year.",
      md: `Halden builds systems that, if they fail, can hurt people. The quality system exists so that they do not, and the safety record is published so that customers can hold us to it.

## Quality system

- Certified to ISO 9001 across all engineering centres and service regions.
- Functional safety work to IEC 61511 (process) and IEC 62061 (machinery), carried out by engineers certified by an independent body.
- Every safety instrumented system is independently reviewed by a Halden engineer not involved in its design before commissioning.
- Secure development of our own software products to IEC 62443-4-1.
- Factory acceptance testing against the agreed specification, with the customer present, before anything ships to site.

## Safety on site

Our engineers work on live plants, often during maintenance windows when the plant is at its least familiar. Every site visit starts with the plant's permit-to-work process and our own job safety analysis.

| Measure | Last year |
| --- | --- |
| Lost-time incidents on Halden sites | 0 |
| Recordable incidents per million hours | 0.4 |
| Near misses reported | 1,120 |
| Near misses investigated and closed | 100 percent |

We count near misses as a positive: a rising number of reports with a falling number of incidents means people are speaking up. The year without a lost-time incident is written up in the [newsroom](/blog/a-year-without-a-lost-time-incident).

## Raising a concern

Anyone, including customers and suppliers, can raise a safety or quality concern through the [contact page](/contact_us). Concerns go to the quality director, not to the project team involved.`,
    },
    // ------------------------------------------------------------------ Careers
    {
      slug: "careers",
      title: "Careers",
      seoTitle: "Careers at Halden Systems",
      excerpt:
        "Engineering, service and commercial roles across 38 countries. Most of our engineers spend time on plant floors, and most of our leaders started there.",
      md: `We hire control, electrical, software and data engineers, field service technicians, project managers, OT security specialists and commercial roles, in every region we work in.

## What it is like

Most of our engineers spend time on plant floors, not only in offices. You will see the systems you design being commissioned, and you will get the call when something goes wrong, which is how you learn to build things that do not. Our Chief Executive started as a commissioning engineer; so did a third of the regional leadership.

## How we hire

1. **A conversation with the hiring manager** about the work, not a screening call.
2. **A practical exercise** close to the real job, paid if it takes more than two hours.
3. **A visit to the team** you would join, on site where possible.

We reply to every application within two weeks, with a reason if the answer is no.

## What we offer

| | |
| --- | --- |
| Development | A funded certification path (functional safety, IEC 62443, project management) and time to use it |
| Mobility | Moves between engineering centres and regions are common and supported |
| Safety | A safety record we publish, and the authority for anyone to stop work |
| Pay | Benchmarked by country each year; published bands for engineering grades |

## Early careers

Graduate programmes and apprenticeships are described on the [early careers](/early-careers) page.

## Open roles

Open roles are listed on the careers portal, linked from each region's page. If you do not see the right one, [send us a message](/contact_us) and say what you are looking for; we read every one.`,
    },
    {
      slug: "early-careers",
      title: "Early careers",
      seoTitle: "Graduate programme and apprenticeships",
      excerpt:
        "An 18 month graduate programme with three rotations, and apprenticeships in Switzerland and Germany.",
      md: `## Graduate programme

An 18 month programme in Zurich, Pune, Monterrey and Singapore with three rotations:

1. **An engineering centre**, building and testing systems alongside senior engineers.
2. **A service team**, supporting live plants and learning what breaks and why.
3. **A customer site**, embedded with the plant's own team for a project.

Graduates finish with a permanent role in the practice area they chose and a mentor who stays with them for the following year.

We look for control, electrical, mechanical, software and data engineering graduates. Applications for next year's intake are open; see the [newsroom announcement](/blog/graduate-programme-applications-open).

## Apprenticeships

Four-year apprenticeships in automation and electrical engineering in Switzerland and Germany, following the national apprenticeship frameworks. Apprentices spend their final year on a customer site with a service team.

## Internships

Summer internships of 10 to 12 weeks at each engineering centre, paid, with a real project and a named supervisor. Applications open each January.

## What we are looking for

Curiosity about how things work, the willingness to say "I do not know" and the habit of asking why. Grades matter less than the practical exercise.

[Ask a question](/contact_us) about any of these.`,
    },
    // ---------------------------------------------------------------- Investors
    {
      slug: "investors",
      title: "Investors",
      seoTitle: "Investors and reporting",
      excerpt:
        "Halden is privately held by the founders' foundation and employees. We report annually and update quarterly.",
      md: `Halden Systems AG is privately held. The founders' foundation holds a majority and employees hold the remainder through the employee share plan. The company is not listed and does not intend to list.

We report as if we were, because our customers, lenders and employees ask us to.

## Reporting

| | |
| --- | --- |
| Annual report | Audited financial statements, governance report and the full sustainability report, published each March |
| Quarterly updates | Order intake, revenue, service base and guidance, published in the newsroom |
| Sustainability report | Scope 1, 2 and 3 with measured and estimated numbers marked, part of the annual report |

The latest quarterly update is in the newsroom: [third quarter trading update](/blog/third-quarter-trading-update).

## Key figures

| | Last financial year |
| --- | --- |
| Revenue growth | 6 percent |
| Order intake growth | 9 percent |
| Plants under service contract | 1,900 |
| Employees | 12,400 |

## Governance

The board has seven members with an independent chair; see [leadership](/leadership). The governance report in the annual report covers board committees, remuneration and risk management.

## Contact

Investor and lender enquiries go to the Chief Financial Officer's office through the [contact page](/contact_us).`,
    },
    // -------------------------------------------------------------------- Legal
    {
      slug: "privacy",
      title: "Privacy notice",
      excerpt:
        "How Halden Systems handles personal data collected through this website.",
      md: `This notice covers personal data collected through this website. The data controller is Halden Systems AG, Zurich.

## What we collect and why

| Data | Purpose | Kept for |
| --- | --- | --- |
| Page views | Understanding which pages are used. Counted without cookies, without IP addresses or user agents | Aggregated daily, never personal |
| Contact form, chat and booking details | Responding to your enquiry | 24 months, or until you ask us to delete them |
| Newsletter email address | Sending the newsletter you asked for | Until you unsubscribe |
| Account details (customers and partners) | Providing the customer portal | For the life of the account |

## What we do not do

- No third-party tracking scripts are loaded on this site.
- We do not sell or share personal data with third parties for their own purposes.
- We do not use your enquiry to add you to marketing lists without asking.

## Your rights

You can ask for a copy of your data, ask for it to be corrected or deleted, or object to its use, through the [contact page](/contact_us). We respond within 30 days.

## Changes

This notice was last updated this year. Material changes are announced in the newsroom.`,
    },
    {
      slug: "terms",
      title: "Terms of use",
      excerpt: "Terms for using this website.",
      md: `This website is provided by Halden Systems AG for information purposes.

- Content is provided without warranty and may change without notice.
- Product and service descriptions are indicative. Specifications, prices and commitments are confirmed in writing as part of a quotation, and nothing on this site forms an offer.
- Customer stories are published with the customer's approval and reflect their experience; results at other plants will differ.
- Trademarks and content belong to Halden Systems AG or their respective owners.
- These terms are governed by Swiss law, with the courts of Zurich having jurisdiction.

Questions about these terms go through the [contact page](/contact_us).`,
    },
    {
      slug: "accessibility",
      title: "Accessibility statement",
      excerpt:
        "This site is built to WCAG 2.2 level AA. Tell us if something does not work for you.",
      md: `Halden Systems wants everyone to be able to use this website. It is built to meet the Web Content Accessibility Guidelines (WCAG) 2.2 at level AA.

## What that means in practice

- Every page can be used with a keyboard alone.
- Headings, landmarks and form labels are structured for screen readers.
- Text and interface elements meet the contrast requirements, including the focus indicator.
- The site works at 200 percent zoom and respects the reduced motion setting.
- Images that carry information have text alternatives; decorative images are hidden from assistive technology.

## Known limitations

- Some older PDF documents in the annual report archive were not produced to accessibility standards. We are re-issuing them as we update them; ask us for an accessible version in the meantime.
- Embedded booking calendars are provided by a third party and may not fully meet the guidelines.

## Tell us

If something on this site does not work for you, [contact us](/contact_us) and say which page and what happened. We aim to fix accessibility problems within two weeks and will tell you when it is done.`,
    },
  ],
  posts: [
    {
      slug: "predictive-maintenance-across-40-sites-three-lessons",
      title:
        "Three lessons from rolling out predictive maintenance across 40 sites",
      excerpt:
        "Two years, 40 plants, 11 countries. What worked, what did not, and what we would do differently.",
      tags: ["engineering", "predictive-maintenance"],
      days: 4,
      cover: `${IMG}/cover-predictive-maintenance-40-sites.png`,
      md: `Over the past two years Halden rolled out predictive maintenance across 40 sites for a single pulp and paper customer, including the 14 Nordfjord Paper mills written up on the [customer stories](/customers) page. Here are the three lessons that would have saved the most time had we known them at the start.

## 1. Sensors are the easy part

Fitting vibration and temperature sensors to rotating equipment was the quickest part of every site. The slow part was agreeing who gets the alert and what they do with it. Where the plant had a named owner for each asset, the system paid for itself within months. Where it did not, alerts went to a shared inbox and were ignored.

We now refuse to switch alerts on for an asset until it has a named owner. It sounds bureaucratic; it is the single biggest predictor of whether the system works.

## 2. Start with the equipment that has stopped the line before

Every plant has a short list of machines everyone knows will fail again. Starting there builds trust fast, because the first alert the maintenance team gets is one they believe. Starting with a complete asset register, as we did at the first three sites, produced hundreds of alerts on equipment nobody was worried about and taught the team to ignore them.

## 3. Models are local

A model trained on one site's refiner did not transfer cleanly to the next site's. Same machine, different load profile, different fault signatures. We now treat the first eight weeks at any site as calibration, say so in the contract, and do not report results until the calibration period is over.

## The result

Across the 40 sites, unplanned stops on monitored equipment fell by a little under half. The customer's own figure is in their annual report; ours is the one above. The practice area page has the current [commercial model](/solutions-predictive-maintenance).`,
    },
    {
      slug: "customer-story-nordfjord-paper",
      title: "Customer story: how Nordfjord Paper cut unplanned stops in half",
      excerpt:
        "Fourteen mills, three countries, 900 monitored assets. Ingrid Solberg on what changed and what she would tell another operations lead.",
      tags: ["customer-stories", "predictive-maintenance"],
      days: 9,
      cover: `${IMG}/cover-nordfjord-story.png`,
      md: `Nordfjord Paper runs 14 mills across Norway, Sweden and Finland. Two years ago unplanned stops on refiners and dryer sections were its largest single cause of lost production. We asked Ingrid Solberg, VP Operations, to describe the programme in her own words.

## Why predictive maintenance

"We had tried it before with another vendor and it produced noise. Hundreds of alerts, nobody trusted them, the system was switched off within a year. What was different this time was the sequencing. Halden insisted on starting with the five machines at each mill that had actually stopped us, and on naming an owner for every alert before it went live."

## The rollout

"Mill by mill, roughly six weeks each. The first eight weeks at every site were calibration and we were told not to expect results in that period, which was honest and turned out to be right. By the end of two years we had around 900 monitored assets."

## What changed

"Unplanned stops on monitored equipment fell by just under half across the group. The first alert that mattered was a refiner bearing at our largest mill; we replaced it in a planned stop ten days later and the old bearing was visibly failing. That one event covered the cost of the programme."

## What she would tell another operations lead

"Name the owners first. Start small. Do not report numbers in the calibration period. And put the Halden reliability engineer in your monthly maintenance meeting, not in a separate call."

The engineering lessons from this and other programmes are in [three lessons from rolling out predictive maintenance across 40 sites](/blog/predictive-maintenance-across-40-sites-three-lessons).`,
    },
    {
      slug: "halden-expands-pune-engineering-centre",
      title: "Halden expands its Pune engineering centre",
      excerpt:
        "A second building and 600 additional engineering roles over three years, focused on software and data for plant systems.",
      tags: ["news", "company"],
      days: 16,
      cover: `${IMG}/cover-pune-expansion.png`,
      md: `Halden Systems has opened a second building at its Pune engineering centre, adding capacity for 600 engineering roles over the next three years.

The expansion focuses on software and data engineering for plant systems: predictive maintenance models, energy management reporting and the cyber security tooling used across the operational technology practice.

"Pune started in 2004 with twelve people writing operator interface software," said Rajesh Iyer, Chief Technology Officer, who founded the centre. "It is now our largest engineering site and the home of the products that our newer practice areas run on. The second building is about giving those teams room to grow."

Pune today hosts teams working on projects in all 38 countries where Halden operates. Roles will be listed on the careers portal as they open; see the [careers page](/careers) for how we hire and the [early careers page](/early-careers) for the graduate programme, which runs in Pune.`,
    },
    {
      slug: "how-we-audit-supplier-emissions",
      title: "How we audit supplier emissions, and why it took three years",
      excerpt:
        "Getting usable scope 3 data from 2,100 suppliers was harder than any control system we have built.",
      tags: ["sustainability", "company"],
      days: 31,
      cover: `${IMG}/cover-supplier-emissions.png`,
      md: `Halden reports scope 1, 2 and 3 emissions in its annual report. Scope 3, the emissions in our supply chain, took three years to get to a number we would put our name to. This is how, written up because every industrial customer we have is going through the same exercise.

## Year one: asking

We asked our 2,100 suppliers for emissions data. About a fifth replied, and of those, fewer than half used a method we could compare. The exercise produced a spreadsheet and no usable number.

## Year two: standardising

We settled on one method, published a short guide for suppliers, and paid for the largest 200 suppliers to be assessed by a third party. That covered around 70 percent of spend and produced the first number we trusted for that 70 percent.

## Year three: estimating honestly

For the long tail we use spend-based estimates and say so. The report marks every number as measured, supplier-reported or estimated, and the proportion of each is on the first page of the sustainability section.

## The principle

The honest version is more useful than the clean one. A single total with no indication of how it was built invites nobody to improve it. A total that says "70 percent measured, 30 percent estimated" tells you exactly where to work next year. Our target is 90 percent measured coverage by 2028.

The same principle shapes the reporting in our [energy management](/solutions-energy-management) practice. Full figures are on the [sustainability page](/sustainability) and in the annual report.`,
    },
    {
      slug: "third-quarter-trading-update",
      title: "Third quarter trading update",
      excerpt:
        "Order intake up 9 percent year on year, driven by energy management and lifecycle services. Guidance unchanged.",
      tags: ["news", "investors"],
      days: 45,
      cover: `${IMG}/cover-q3-update.png`,
      md: `Halden Systems reports order intake up 9 percent year on year for the third quarter, with energy management and lifecycle services the main contributors. Revenue grew 6 percent and the service contract base grew to 1,900 plants.

| | Q3 | Year on year |
| --- | --- | --- |
| Order intake | Up 9 percent | Energy management and lifecycle services |
| Revenue | Up 6 percent | Growth in all three regions |
| Plants under service | 1,900 | Up from 1,780 |
| Headcount | 12,400 | Pune expansion under way |

"The pattern this quarter is the one we have seen all year," said Marta Keller, Chief Financial Officer. "Customers are buying measurement and service before they buy new capital equipment, and our practice areas are built for that."

Guidance for the full year is unchanged. The full statement and the webcast replay are in the annual report archive; see the [investors page](/investors). Media and investor enquiries through the [contact page](/contact_us).`,
    },
    {
      slug: "ot-cyber-security-what-changed-this-year",
      title:
        "OT cyber security: what changed this year and what plants should do",
      excerpt:
        "New regulation in Europe and new attack patterns everywhere. A short, practical list for plant managers.",
      tags: ["engineering", "security"],
      days: 60,
      cover: `${IMG}/cover-ot-security.png`,
      md: `Operational technology, the systems that run plants, used to be protected mostly by being separate from the internet. That is no longer true, and this year brought both new regulation and new attacks aimed squarely at plants.

## What changed

- The NIS2 directive is now in force across the European Union and brings many mid-sized plants into scope for the first time, with personal liability for management.
- Attacks on remote access tools used by vendors, including ours, increased sharply. Several incidents we responded to this year started with a vendor's credentials.
- Ransomware groups have started targeting the engineering workstations that program controllers, rather than the controllers themselves.

## What a plant should do first

1. **Know what is connected.** Most plants we assess have 20 to 30 percent more devices on the network than their asset list says. You cannot protect what you have not counted.
2. **Segment.** The office network and the plant network should not be able to see each other without passing through something you monitor.
3. **Control vendor access.** Including Halden's. Time-limited, logged, approved per session. If a vendor cannot work that way, ask why.
4. **Have a plan for the day it happens.** Who shuts what down, in what order, and how do you run the plant manually for a shift. Then rehearse it.

## What not to do

Do not apply corporate IT patching policy to the plant without talking to the control engineers. A patch that reboots an engineering workstation mid-download can stop a line, and the fear of that is why so many plant systems are never patched at all. Patching needs a maintenance window and a rollback, like any other change to the plant.

Our OT security teams run assessments against this list; see the [practice area page](/solutions-ot-cyber-security) or [talk to sales](/contact_us).`,
    },
    {
      slug: "a-year-without-a-lost-time-incident",
      title: "A year without a lost-time incident on Halden sites",
      excerpt:
        "Zero lost-time incidents across 12,400 people working on live plants. What we think made the difference, and why near-miss reports went up.",
      tags: ["safety", "company"],
      days: 70,
      cover: `${IMG}/cover-safety-record.png`,
      md: `Last year Halden recorded no lost-time incidents across the group. For a company whose engineers spend most of their time on live industrial plants, often during maintenance windows when the plant is at its least familiar, that is the number we are proudest of.

## What we think made the difference

**Stop-work authority that is actually used.** Anyone on a Halden site can stop work if something looks wrong, without asking and without consequence. Last year it was used 212 times. Each one was reviewed and in 190 cases the stop was judged correct.

**Near misses treated as good news.** Near-miss reports rose to 1,120, up from 870 the year before. A rising number of reports with a falling number of incidents means people are speaking up, and every report was investigated and closed.

**Job safety analysis before every visit.** Not a form to sign, a conversation with the plant's own team about what is different today.

## What we are watching

Recordable incidents, which include injuries that do not cause lost time, were 0.4 per million hours. That is low but not zero, and most of them were hand injuries during cabinet work. We have changed the glove standard and are tracking it this year.

The full safety record and the quality system behind it are on the [quality and safety page](/quality-and-safety).`,
    },
    {
      slug: "graduate-programme-applications-open",
      title: "Graduate programme: applications open for next year",
      excerpt:
        "Rotations through engineering, service and a customer site in Zurich, Pune, Monterrey and Singapore.",
      tags: ["careers", "news"],
      days: 85,
      cover: `${IMG}/cover-graduate-programme.png`,
      md: `Applications are open for next year's graduate programme in Zurich, Pune, Monterrey and Singapore.

The programme runs for 18 months with three rotations: an engineering centre, a service team, and a customer site. Graduates finish with a permanent role in the practice area they chose and a mentor for the following year.

We look for control, electrical, mechanical, software and data engineering graduates, and we reply to every application within two weeks, with a reason if the answer is no.

"The customer site rotation is the one people remember," said Jonas Bruhn, Chief Operating Officer, who runs the programme. "It is where you find out whether the thing you designed in the first rotation actually works at three in the morning."

Details, including apprenticeships and internships, are on the [early careers page](/early-careers).`,
    },
  ],
}
