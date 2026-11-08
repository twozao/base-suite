<script lang="ts">
  import { page } from "$app/stores"
  import PostCard from "$lib/components/site/PostCard.svelte"
  import NewsletterSignup from "$lib/components/site/NewsletterSignup.svelte"
  import { formatDate } from "$lib/format"
  import { enhance } from "$app/forms"
  let { data, form } = $props()
  let replyTo: number | null = $state(null)
  let turnstileLoaded = $state(false)
  $effect(() => {
    if (!data.comments.turnstile || !data.comments.open || turnstileLoaded)
      return
    const s = document.createElement("script")
    s.src = "https://challenges.cloudflare.com/turnstile/v0/api.js"
    s.async = true
    document.head.append(s)
    turnstileLoaded = true
  })
  const post = $derived(data.post)
  // Structured data for search engines (JSON is escaped, see jsonLd below)
  const ldOpen = "<" + 'script type="application/ld+json">'
  const ldClose = "</" + "script>"
  const jsonLd = $derived(
    JSON.stringify({
      "@context": "https://schema.org",
      "@type": "BlogPosting",
      headline: post.title,
      description: data.metaDescription,
      datePublished: post.published_at,
      dateModified: post.updated_at,
      author: post.author_name
        ? { "@type": "Person", name: post.author_name }
        : undefined,
      image: post.cover_image_url ?? undefined,
      publisher: { "@type": "Organization", name: data.site.brand.siteName },
    }).replace(/</g, "\\u003c"),
  )
</script>

<svelte:head>
  <title>{data.metaTitle} | {data.site.brand.siteName}</title>
  <meta name="description" content={data.metaDescription} />
  <meta property="og:type" content="article" />
  <meta property="og:title" content={data.metaTitle} />
  <meta property="og:description" content={data.metaDescription} />
  {#if post.og_image_url || post.cover_image_url}<meta
      property="og:image"
      content={post.og_image_url || post.cover_image_url}
    />{/if}
  {#if post.seo_noindex}<meta name="robots" content="noindex" />{/if}
  <link rel="canonical" href="{$page.url.origin}{$page.url.pathname}" />
  {#each data.alternates as a (a.code)}<link
      rel="alternate"
      hreflang={a.code}
      href="{$page.url.origin}{a.href}"
    />{/each}
  <!-- eslint-disable-next-line svelte/no-at-html-tags -->
  {@html ldOpen + jsonLd + ldClose}
</svelte:head>

<article>
  <header class="bg-brand-glow">
    <div class="mx-auto max-w-3xl px-4 sm:px-6 pt-14 pb-10 sm:pt-20">
      <a
        href="/blog"
        class="text-sm text-base-content/60 hover:text-base-content"
        >All posts</a
      >
      {#if post.tags.length}
        <div class="mt-6 flex flex-wrap gap-1">
          {#each post.tags as tag}<a
              href="/blog?tag={encodeURIComponent(tag)}"
              class="badge badge-soft badge-primary">{tag}</a
            >{/each}
        </div>
      {/if}
      <h1
        class="mt-4 text-4xl sm:text-5xl font-bold tracking-tight leading-tight"
      >
        {post.title}
      </h1>
      {#if post.excerpt}<p
          class="mt-5 text-xl text-base-content/70 leading-relaxed"
        >
          {post.excerpt}
        </p>{/if}
      <p class="mt-6 text-sm text-base-content/60">
        {#if post.author_name}<span class="font-medium text-base-content"
            >{post.author_name}</span
          > -
        {/if}
        <time datetime={post.published_at}>{formatDate(post.published_at)}</time
        >
        - {data.readingMinutes} min read
      </p>
    </div>
  </header>

  {#if post.cover_image_url}
    <div class="mx-auto max-w-4xl px-4 sm:px-6">
      <img
        src={post.cover_image_url}
        alt=""
        class="w-full rounded-box border border-base-300 aspect-[16/9] object-cover"
        fetchpriority="high"
      />
    </div>
  {/if}

  <div
    class="prose prose-lg mx-auto max-w-3xl px-4 sm:px-6 py-12 prose-a:text-primary prose-img:rounded-box"
  >
    <!-- Sanitised at save time by $lib/server/cms/markdown -->
    <!-- eslint-disable-next-line svelte/no-at-html-tags -->
    {@html post.body_html}
  </div>
</article>

{#if data.comments.enabled}
  <section
    class="mx-auto max-w-3xl px-4 sm:px-6 pb-12"
    id="comments"
    aria-labelledby="comments-title"
  >
    <h2 id="comments-title" class="text-2xl font-bold mb-6">
      {data.comments.list.length
        ? `${data.comments.list.length} comment${data.comments.list.length === 1 ? "" : "s"}`
        : "Comments"}
    </h2>
    <ul class="space-y-6 mb-8">
      {#each data.comments.list as c (c.id)}
        <li>
          <p class="font-semibold">
            {c.author_name}
            <span class="text-sm font-normal text-base-content/60"
              >{formatDate(c.created_at)}</span
            >
          </p>
          <p class="mt-1 whitespace-pre-line">{c.body}</p>
          {#if data.comments.open}<button
              type="button"
              class="btn btn-link btn-xs px-0"
              onclick={() => (replyTo = c.id)}>Reply</button
            >{/if}
          {#if c.replies.length}
            <ul class="mt-3 space-y-4 border-l-2 border-base-300 pl-4">
              {#each c.replies as r (r.id)}
                <li>
                  <p class="font-semibold">
                    {r.author_name}
                    <span class="text-sm font-normal text-base-content/60"
                      >{formatDate(r.created_at)}</span
                    >
                  </p>
                  <p class="mt-1 whitespace-pre-line">{r.body}</p>
                </li>
              {/each}
            </ul>
          {/if}
        </li>
      {/each}
    </ul>
    {#if form?.commented}
      <div role="status" class="alert alert-success">
        {form.pending
          ? "Thanks! Your comment will appear once it is approved."
          : "Thanks! Your comment is posted."}
      </div>
    {:else if data.comments.open}
      <form
        method="POST"
        action="?/comment"
        use:enhance
        class="space-y-3 rounded-box border border-base-300 p-5"
      >
        <h3 class="font-semibold">
          {replyTo ? "Reply" : "Leave a comment"}{#if replyTo}
            <button
              type="button"
              class="btn btn-ghost btn-xs"
              onclick={() => (replyTo = null)}>Cancel reply</button
            >{/if}
        </h3>
        <input type="hidden" name="parent" value={replyTo ?? ""} />
        <div class="grid gap-3 sm:grid-cols-2">
          <label class="text-sm"
            >Name<input
              name="name"
              class="input w-full"
              maxlength="100"
              autocomplete="name"
              required
              value={form?.values?.name ?? ""}
            /></label
          >
          <label class="text-sm"
            >Email (not shown)<input
              name="email"
              type="email"
              class="input w-full"
              maxlength="320"
              autocomplete="email"
              value={form?.values?.email ?? ""}
            /></label
          >
        </div>
        <label class="hidden" aria-hidden="true"
          >Website<input
            name="website"
            tabindex="-1"
            autocomplete="off"
          /></label
        >
        <label class="text-sm block"
          >Comment<textarea
            name="body"
            class="textarea w-full h-28"
            maxlength="5000"
            required>{form?.values?.body ?? ""}</textarea
          ></label
        >
        {#if data.comments.turnstile}<div
            class="cf-turnstile"
            data-sitekey={data.comments.turnstile}
          ></div>{/if}
        {#if form?.commentError}<p class="text-error text-sm" role="alert">
            {form.commentError}
          </p>{/if}
        <button class="btn btn-primary">Post comment</button>
      </form>
    {:else}
      <p class="text-base-content/60">Comments are closed.</p>
    {/if}
  </section>
{/if}

{#if data.site.modules.newsletter}
  <aside class="mx-auto max-w-3xl px-4 sm:px-6 pb-12">
    <div
      class="rounded-box bg-primary/5 border border-primary/20 p-8 text-center"
    >
      <h2 class="text-xl font-bold">Enjoyed this post?</h2>
      <p class="mt-1 text-base-content/70">Get the next one in your inbox.</p>
      <div class="mt-5"><NewsletterSignup source="blog:{post.slug}" /></div>
    </div>
  </aside>
{/if}

{#if data.related.length}
  <section
    class="mx-auto max-w-6xl px-4 sm:px-6 py-12 border-t border-base-300"
  >
    <h2 class="text-2xl font-bold mb-6">Keep reading</h2>
    <div class="grid gap-6 md:grid-cols-3">
      {#each data.related as p (p.slug)}<PostCard post={p} />{/each}
    </div>
  </section>
{/if}
