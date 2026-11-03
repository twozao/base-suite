<script lang="ts">
  import PostCard from "$lib/components/site/PostCard.svelte"
  let { data } = $props()
  const pageHref = (p: number) => {
    const q = new URLSearchParams()
    if (data.tag) q.set("tag", data.tag)
    if (p > 1) q.set("page", String(p))
    const s = q.toString()
    return s ? `/blog?${s}` : "/blog"
  }
</script>

<svelte:head>
  <title
    >{data.tag ? `${data.tag} · ` : ""}Blog | {data.site.brand.siteName}</title
  >
  <meta
    name="description"
    content="News, guides and updates from {data.site.brand.siteName}."
  />
  <link
    rel="alternate"
    type="application/rss+xml"
    title="{data.site.brand.siteName} blog"
    href="/blog/rss.xml"
  />
</svelte:head>

<section class="bg-brand-glow">
  <div class="mx-auto max-w-6xl px-4 sm:px-6 pt-16 pb-10 sm:pt-20">
    <div class="flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 class="text-4xl sm:text-5xl font-bold tracking-tight">Blog</h1>
        <p class="mt-3 text-lg text-base-content/70">
          News, guides and updates from {data.site.brand.siteName}.
        </p>
      </div>
      <a href="/blog/rss.xml" class="btn btn-ghost btn-sm">RSS feed</a>
    </div>
    {#if data.tags.length}
      <nav class="mt-8 flex flex-wrap gap-2" aria-label="Filter by tag">
        <a
          href="/blog"
          class="badge badge-lg {data.tag ? 'badge-ghost' : 'badge-primary'}"
          >All</a
        >
        {#each data.tags as t}
          <a
            href="/blog?tag={encodeURIComponent(t)}"
            class="badge badge-lg {data.tag === t
              ? 'badge-primary'
              : 'badge-ghost'}">{t}</a
          >
        {/each}
      </nav>
    {/if}
  </div>
</section>

<div class="mx-auto max-w-6xl px-4 sm:px-6 pb-8">
  {#if data.posts.length}
    <div class="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      {#each data.posts as post, i (post.slug)}
        <PostCard {post} featured={i === 0 && data.page === 1 && !data.tag} />
      {/each}
    </div>
    {#if data.pages > 1}
      <nav class="mt-12 flex justify-center gap-2" aria-label="Pagination">
        {#if data.page > 1}<a
            class="btn btn-outline"
            href={pageHref(data.page - 1)}>← Newer</a
          >{/if}
        <span class="btn btn-ghost no-animation cursor-default"
          >Page {data.page} of {data.pages}</span
        >
        {#if data.page < data.pages}<a
            class="btn btn-outline"
            href={pageHref(data.page + 1)}>Older →</a
          >{/if}
      </nav>
    {/if}
  {:else}
    <div
      class="rounded-box border border-dashed border-base-300 p-16 text-center text-base-content/60"
    >
      {data.tag
        ? `No posts tagged “${data.tag}” yet.`
        : "No posts yet — check back soon."}
    </div>
  {/if}
</div>
