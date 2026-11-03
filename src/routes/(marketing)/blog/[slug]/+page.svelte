<script lang="ts">
  import { page } from "$app/stores"
  import PostCard from "$lib/components/site/PostCard.svelte"
  import { formatDate } from "$lib/format"
  let { data } = $props()
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
  {#if post.cover_image_url}<meta
      property="og:image"
      content={post.cover_image_url}
    />{/if}
  <link rel="canonical" href="{$page.url.origin}/blog/{post.slug}" />
  <!-- eslint-disable-next-line svelte/no-at-html-tags -->
  {@html ldOpen + jsonLd + ldClose}
</svelte:head>

<article>
  <header class="bg-brand-glow">
    <div class="mx-auto max-w-3xl px-4 sm:px-6 pt-14 pb-10 sm:pt-20">
      <a
        href="/blog"
        class="text-sm text-base-content/60 hover:text-base-content"
        >← All posts</a
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
          > ·
        {/if}
        <time datetime={post.published_at}>{formatDate(post.published_at)}</time
        >
        · {data.readingMinutes} min read
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
