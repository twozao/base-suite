<script lang="ts">
  import Icon from "$lib/components/site/Icon.svelte"
  import Section from "$lib/components/site/Section.svelte"
  import Faq from "$lib/components/site/Faq.svelte"
  import PricingCards from "$lib/components/site/PricingCards.svelte"
  import PostCard from "$lib/components/site/PostCard.svelte"

  let { data } = $props()
  const home = $derived(data.home)
  const site = $derived(data.site)
  // Minimal-style themes drop the product mock and centre the hero; an uploaded hero image still shows.
  const centered = $derived(
    site.heroLayout === "centered" && !home.hero.imageUrl,
  )
  const initials = (name: string) =>
    name
      .split(/\s+/)
      .map((p) => p[0])
      .slice(0, 2)
      .join("")
      .toUpperCase()
</script>

<svelte:head>
  <title
    >{site.brand.siteName}{site.brand.tagline
      ? ` - ${site.brand.tagline}`
      : ""}</title
  >
  <meta name="description" content={site.brand.description} />
  <meta property="og:title" content={site.brand.siteName} />
  <meta property="og:description" content={site.brand.description} />
</svelte:head>

<!-- Hero -->
<section class="bg-brand-glow">
  <div
    class="mx-auto grid max-w-6xl items-center gap-12 px-4 sm:px-6 pt-16 pb-20 sm:pt-24 {centered
      ? 'text-center'
      : 'lg:grid-cols-2'}"
  >
    <div class={centered ? "mx-auto max-w-3xl" : ""}>
      {#if home.hero.eyebrow}
        <span class="badge badge-soft badge-primary mb-5"
          >{home.hero.eyebrow}</span
        >
      {/if}
      <h1
        class="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight leading-[1.08]"
      >
        {home.hero.title}
        {#if home.hero.highlight}<span class="text-gradient"
            >{home.hero.highlight}</span
          >{/if}
      </h1>
      {#if home.hero.subtitle}
        <p
          class="mt-6 text-lg text-base-content/70 max-w-xl leading-relaxed {centered
            ? 'mx-auto'
            : ''}"
        >
          {home.hero.subtitle}
        </p>
      {/if}
      <div class="mt-8 flex flex-wrap gap-3 {centered ? 'justify-center' : ''}">
        {#if home.hero.primaryCta.label && home.hero.primaryCta.href}
          <a href={home.hero.primaryCta.href} class="btn btn-primary btn-lg">
            {home.hero.primaryCta.label}
            <Icon name="arrow" class="h-5 w-5" />
          </a>
        {/if}
        {#if home.hero.secondaryCta.label && home.hero.secondaryCta.href}
          <a href={home.hero.secondaryCta.href} class="btn btn-outline btn-lg"
            >{home.hero.secondaryCta.label}</a
          >
        {/if}
      </div>
    </div>

    {#if !centered}
      <div class="relative">
        {#if home.hero.imageUrl}
          <img
            src={home.hero.imageUrl}
            alt=""
            class="w-full rounded-box border border-base-300 shadow-2xl"
            fetchpriority="high"
          />
        {:else}
          <!-- Illustrative product preview, pure HTML so it costs nothing to load -->
          <div
            class="rounded-box border border-base-300 bg-base-100 shadow-2xl overflow-hidden"
            aria-hidden="true"
          >
            <div
              class="flex items-center gap-1.5 border-b border-base-300 px-4 py-3"
            >
              <span class="h-3 w-3 rounded-full bg-error/70"></span>
              <span class="h-3 w-3 rounded-full bg-warning/70"></span>
              <span class="h-3 w-3 rounded-full bg-success/70"></span>
              <span class="ml-3 text-xs text-base-content/50"
                >{site.brand.siteName} - Admin</span
              >
            </div>
            <div class="grid grid-cols-[7rem_1fr]">
              <div class="border-r border-base-300 p-3 space-y-2 text-xs">
                {#each ["Dashboard", "Pages", "Blog", "Live chat", "Bookings"] as item, i}
                  <div
                    class="rounded px-2 py-1.5 {i === 0
                      ? 'bg-primary text-primary-content'
                      : 'text-base-content/60'}"
                  >
                    {item}
                  </div>
                {/each}
              </div>
              <div class="p-4 space-y-3">
                <div class="grid grid-cols-3 gap-2">
                  {#each [["Visitors", "2,481"], ["Open chats", "3"], ["Bookings", "12"]] as [label, value]}
                    <div class="rounded-lg border border-base-300 p-3">
                      <div class="text-[10px] text-base-content/50">
                        {label}
                      </div>
                      <div class="text-lg font-bold">{value}</div>
                    </div>
                  {/each}
                </div>
                <div class="rounded-lg border border-base-300 p-3 space-y-2">
                  <div class="text-xs font-semibold">Live chat</div>
                  <div class="chat chat-start">
                    <div
                      class="chat-bubble chat-bubble-sm text-xs min-h-0 py-1.5"
                    >
                      Hi! Do you offer annual plans?
                    </div>
                  </div>
                  <div class="chat chat-end">
                    <div
                      class="chat-bubble chat-bubble-primary text-xs min-h-0 py-1.5"
                    >
                      Yes - save 20% yearly
                    </div>
                  </div>
                </div>
                <div
                  class="h-16 rounded-lg bg-gradient-to-r from-primary/20 via-primary/40 to-accent/40"
                ></div>
              </div>
            </div>
          </div>
        {/if}
      </div>
    {/if}
  </div>
</section>

{#if home.stats.show && home.stats.items.length}
  <section class="border-y border-base-300 bg-base-100">
    <dl
      class="mx-auto grid max-w-6xl grid-cols-2 gap-8 px-4 sm:px-6 py-10 md:grid-cols-4"
    >
      {#each home.stats.items as s}
        <div class="flex flex-col-reverse text-center">
          <dt class="mt-1 text-sm text-base-content/60">{s.label}</dt>
          <dd class="text-3xl font-bold tracking-tight text-primary">
            {s.value}
          </dd>
        </div>
      {/each}
    </dl>
  </section>
{/if}

{#if home.features.show && home.features.items.length}
  <Section
    id="features"
    title={home.features.title}
    subtitle={home.features.subtitle}
  >
    <div class="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {#each home.features.items as f}
        <div
          class="rounded-box border border-base-300 bg-base-100 p-6 transition hover:-translate-y-0.5 hover:shadow-md"
        >
          <span
            class="grid h-11 w-11 place-items-center rounded-lg bg-primary/10 text-primary"
          >
            <Icon name={f.icon} />
          </span>
          <h3 class="mt-4 font-semibold text-lg">{f.title}</h3>
          <p class="mt-2 text-base-content/70 leading-relaxed">{f.body}</p>
        </div>
      {/each}
    </div>
  </Section>
{/if}

{#if home.steps.show && home.steps.items.length}
  <Section title={home.steps.title} tint>
    <ol
      class="grid gap-8 {home.steps.items.length >= 3
        ? 'md:grid-cols-3'
        : 'md:grid-cols-2'}"
    >
      {#each home.steps.items as step, i}
        <li class="relative rounded-box bg-base-100 border border-base-300 p-6">
          <span
            class="grid h-9 w-9 place-items-center rounded-full bg-primary text-primary-content font-bold"
            >{i + 1}</span
          >
          <h3 class="mt-4 font-semibold text-lg">{step.title}</h3>
          <p class="mt-2 text-base-content/70">{step.body}</p>
        </li>
      {/each}
    </ol>
  </Section>
{/if}

{#if home.testimonials.show && home.testimonials.items.length}
  <Section title={home.testimonials.title}>
    <div class="grid gap-6 md:grid-cols-3">
      {#each home.testimonials.items as t}
        <figure
          class="flex flex-col rounded-box border border-base-300 bg-base-100 p-6"
        >
          <div class="flex gap-0.5 text-accent" aria-label="5 out of 5 stars">
            {#each [1, 2, 3, 4, 5] as star (star)}<Icon
                name="star"
                class="h-4 w-4 fill-current"
              />{/each}
          </div>
          <blockquote class="mt-4 grow leading-relaxed">"{t.quote}"</blockquote>
          <figcaption class="mt-6 flex items-center gap-3">
            {#if t.avatarUrl}
              <img
                src={t.avatarUrl}
                alt=""
                class="h-10 w-10 rounded-full object-cover"
                loading="lazy"
              />
            {:else}
              <span
                class="grid h-10 w-10 place-items-center rounded-full bg-secondary text-secondary-content text-sm font-semibold"
                >{initials(t.name)}</span
              >
            {/if}
            <span>
              <span class="block font-semibold text-sm">{t.name}</span>
              {#if t.role}<span class="block text-sm text-base-content/60"
                  >{t.role}</span
                >{/if}
            </span>
          </figcaption>
        </figure>
      {/each}
    </div>
  </Section>
{/if}

{#if site.modules.subscriptions && data.plans.length}
  <Section
    id="pricing"
    title="Pricing"
    subtitle="Plans that grow with you."
    tint
  >
    <PricingCards plans={data.plans} />
    <p class="mt-8 text-center">
      <a href="/pricing" class="link link-primary"
        >Compare plans and read the pricing FAQ -></a
      >
    </p>
  </Section>
{/if}

{#if data.latestPosts.length}
  <Section title="From the blog">
    <div class="grid gap-6 md:grid-cols-3">
      {#each data.latestPosts as post (post.slug)}
        <PostCard {post} />
      {/each}
    </div>
    <p class="mt-8 text-center">
      <a href="/blog" class="btn btn-outline">All posts</a>
    </p>
  </Section>
{/if}

{#if home.faq.show && home.faq.items.length}
  <Section id="faq" title={home.faq.title}>
    <div class="mx-auto max-w-3xl"><Faq items={home.faq.items} /></div>
  </Section>
{/if}

{#if home.cta.show && home.cta.title}
  <section class="px-4 sm:px-6">
    <div
      class="mx-auto max-w-6xl rounded-box bg-primary text-primary-content px-6 py-16 text-center sm:px-16"
    >
      <h2 class="text-3xl sm:text-4xl font-bold tracking-tight">
        {home.cta.title}
      </h2>
      {#if home.cta.subtitle}<p class="mt-4 text-lg opacity-90">
          {home.cta.subtitle}
        </p>{/if}
      {#if home.cta.button.label && home.cta.button.href}
        <a
          href={home.cta.button.href}
          class="btn btn-lg mt-8 bg-base-100 text-base-content border-0 hover:bg-base-200"
          >{home.cta.button.label}</a
        >
      {/if}
    </div>
  </section>
{/if}
