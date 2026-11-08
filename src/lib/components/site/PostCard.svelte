<script lang="ts">
  import { formatDate } from "$lib/format"
  type Post = {
    slug: string
    title: string
    excerpt: string | null
    cover_image_url: string | null
    tags: string[]
    published_at: string | null
    author_name: string | null
  }
  let { post, featured = false }: { post: Post; featured?: boolean } = $props()
</script>

<article
  class="group flex flex-col overflow-hidden rounded-box border border-base-300 bg-base-100 transition hover:shadow-lg {featured
    ? 'md:flex-row md:col-span-full'
    : ''}"
>
  <a
    href="/blog/{post.slug}"
    class="block {featured ? 'md:w-1/2' : ''}"
    tabindex="-1"
    aria-hidden="true"
  >
    {#if post.cover_image_url}
      <img
        src={post.cover_image_url}
        alt=""
        loading="lazy"
        decoding="async"
        class="aspect-[16/9] w-full object-cover {featured ? 'md:h-full' : ''}"
      />
    {:else}
      <div
        class="aspect-[16/9] w-full bg-gradient-to-br from-primary/80 to-accent/70 grid place-items-center {featured
          ? 'md:h-full'
          : ''}"
      >
        <span class="text-5xl font-bold text-primary-content/90"
          >{post.title.charAt(0)}</span
        >
      </div>
    {/if}
  </a>
  <div
    class="flex flex-col gap-3 p-6 {featured
      ? 'md:w-1/2 md:justify-center md:p-10'
      : ''}"
  >
    {#if post.tags.length}
      <div class="flex flex-wrap gap-1">
        {#each post.tags.slice(0, 3) as tag}
          <a
            href="/blog?tag={encodeURIComponent(tag)}"
            class="badge badge-soft badge-primary badge-sm">{tag}</a
          >
        {/each}
      </div>
    {/if}
    <h2
      class="font-semibold leading-snug {featured
        ? 'text-2xl md:text-3xl'
        : 'text-lg'}"
    >
      <a href="/blog/{post.slug}" class="hover:text-primary">{post.title}</a>
    </h2>
    {#if post.excerpt}<p class="text-base-content/70 line-clamp-3">
        {post.excerpt}
      </p>{/if}
    <p class="mt-auto text-sm text-base-content/60">
      {formatDate(post.published_at)}{post.author_name
        ? ` - ${post.author_name}`
        : ""}
    </p>
  </div>
</article>
