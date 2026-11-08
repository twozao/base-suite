// Ready-made extensions shown in Admin -> Extensions. Each is plain data checked by manifestSchema
// on install, the same as a package an owner uploads.

const f = (
  key: string,
  label: string,
  type: string,
  extra: Record<string, unknown> = {},
) => ({ key, label, type, ...extra })

export const CATALOGUE: Record<string, unknown>[] = [
  {
    id: "case-studies",
    name: "Case studies",
    version: "1.0.0",
    description:
      "Client projects with the challenge, what you did and the results, listed at /case-studies.",
    author: "Base Suite",
    contentTypes: [
      {
        slug: "case_study",
        name: "Case studies",
        singular: "Case study",
        url_prefix: "case-studies",
        description:
          "Work we are proud of, and what it changed for our clients.",
        fields: [
          f("client", "Client", "text", { required: true, showInList: true }),
          f("industry", "Industry", "text", { showInList: true }),
          f("cover", "Cover image", "image"),
          f("challenge", "The challenge", "markdown"),
          f("results", "Results", "markdown"),
          f("website", "Live site", "link"),
          f("year", "Year", "number"),
        ],
      },
    ],
    entries: [
      {
        type: "case_study",
        slug: "sample-project",
        title: "Sample project",
        excerpt: "Replace this with your first case study.",
        fields: {
          client: "Sample client",
          industry: "Retail",
          challenge: "What was hard before you came in.",
          results: "- 40% more enquiries\n- Launched in three weeks",
          year: 2026,
        },
        blocks: [
          { type: "markdown", md: "Tell the story of the project here." },
        ],
        status: "draft",
      },
    ],
  },
  {
    id: "team",
    name: "Team",
    version: "1.0.0",
    description: "People pages with role, photo and links, listed at /team.",
    author: "Base Suite",
    contentTypes: [
      {
        slug: "team_member",
        name: "Team",
        singular: "Team member",
        url_prefix: "team",
        description: "The people you will work with.",
        fields: [
          f("photo", "Photo", "image"),
          f("role", "Role", "text", { required: true, showInList: true }),
          f("location", "Based in", "text", { showInList: true }),
          f("email", "Email", "link", { help: "mailto:name@example.com" }),
          f("linkedin", "LinkedIn", "link"),
        ],
      },
    ],
  },
  {
    id: "testimonials",
    name: "Testimonials",
    version: "1.0.0",
    description:
      "Quotes from customers with their name, company and rating, listed at /testimonials.",
    author: "Base Suite",
    contentTypes: [
      {
        slug: "testimonial",
        name: "Testimonials",
        singular: "Testimonial",
        url_prefix: "testimonials",
        description: "What our customers say.",
        fields: [
          f("quote", "Quote", "textarea", { required: true }),
          f("person", "Name", "text", { required: true, showInList: true }),
          f("company", "Company", "text", { showInList: true }),
          f("rating", "Stars", "select", {
            options: ["5", "4", "3"],
            showInList: true,
          }),
          f("photo", "Photo", "image"),
        ],
      },
    ],
  },
  {
    id: "locations",
    name: "Locations",
    version: "1.0.0",
    description:
      "Offices or shops with address, opening hours and phone, listed at /locations.",
    author: "Base Suite",
    contentTypes: [
      {
        slug: "location",
        name: "Locations",
        singular: "Location",
        url_prefix: "locations",
        description: "Where to find us.",
        fields: [
          f("photo", "Photo", "image"),
          f("address", "Address", "textarea", { required: true }),
          f("city", "City", "text", { showInList: true }),
          f("hours", "Opening hours", "textarea"),
          f("phone", "Phone", "link", { help: "tel:+15551234567" }),
          f("map", "Map link", "link"),
        ],
      },
    ],
  },
  {
    id: "faq",
    name: "FAQ library",
    version: "1.0.0",
    description:
      "Questions and answers grouped by topic, at /faq, plus a reusable FAQ block for any page.",
    author: "Base Suite",
    contentTypes: [
      {
        slug: "faq",
        name: "Frequently asked questions",
        singular: "Question",
        url_prefix: "faq",
        description: "Answers to the questions we hear most.",
        fields: [
          f("topic", "Topic", "select", {
            options: ["General", "Pricing", "Support"],
            showInList: true,
          }),
          f("answer", "Answer", "markdown", { required: true }),
        ],
      },
    ],
    blocks: [
      {
        name: "Common questions",
        blocks: [
          { type: "heading", level: 2, text: "Common questions" },
          {
            type: "faq",
            items: [
              {
                q: "How do I get started?",
                a: "Get in touch and we will reply within a day.",
              },
            ],
          },
        ],
      },
    ],
  },
  {
    id: "seo-pack",
    name: "SEO pack",
    version: "1.0.0",
    description:
      "Adds Organization and breadcrumb structured data to every public page, so search engines show your name, logo and page trail.",
    author: "Base Suite",
    settings: { seo: { structuredData: true } },
  },
]
