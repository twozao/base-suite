<script lang="ts">
  import SeoHead from "$lib/components/site/SeoHead.svelte"
  let { data } = $props()
  const e = $derived(data.entry)
</script>

<SeoHead
  title={e.metaTitle}
  siteName={data.site.brand.siteName}
  description={e.metaDescription}
  image={e.image}
  noindex={e.noindex}
  type="article"
/>

<article>
  <header class="bg-brand-glow">
    <div class="mx-auto max-w-4xl px-4 sm:px-6 pt-14 pb-10 sm:pt-20">
      {#if data.type.hasArchive}
        <a
          class="link link-hover text-sm text-primary"
          href="/{data.type.prefix}">{data.type.name}</a
        >
      {/if}
      <h1 class="mt-2 text-4xl sm:text-5xl font-bold tracking-tight">
        {e.title}
      </h1>
      {#if e.excerpt}<p class="mt-5 text-lg text-base-content/70">
          {e.excerpt}
        </p>{/if}
    </div>
  </header>
  <div class="mx-auto max-w-4xl px-4 sm:px-6 pb-16">
    {#if e.hero}
      <img
        src={e.hero}
        alt=""
        class="mb-10 w-full rounded-box object-cover max-h-[28rem]"
      />
    {/if}
    {#if e.fields.length}
      <dl
        class="mb-10 grid gap-x-8 gap-y-4 sm:grid-cols-2 rounded-box border border-base-300 p-6"
        data-testid="entry-fields"
      >
        {#each e.fields as f (f.label)}
          <div
            class={f.kind === "html" || f.kind === "image"
              ? "sm:col-span-2"
              : ""}
          >
            <dt class="text-sm text-base-content/60">{f.label}</dt>
            <dd class="mt-1">
              {#if f.kind === "text"}{f.value}
              {:else if f.kind === "link"}<a
                  class="link link-primary"
                  href={f.href}>{f.value}</a
                >
              {:else if f.kind === "image"}<img
                  src={f.src}
                  alt=""
                  class="rounded-box max-h-80"
                  loading="lazy"
                />
              {:else}<div class="prose max-w-none">
                  <!-- Rendered with the sanitising Markdown renderer -->
                  <!-- eslint-disable-next-line svelte/no-at-html-tags -->
                  {@html f.html}
                </div>{/if}
            </dd>
          </div>
        {/each}
      </dl>
    {/if}
    <div
      class="prose prose-lg max-w-3xl prose-a:text-primary prose-img:rounded-box"
    >
      <!-- Sanitised at save time by $lib/server/cms/blocks -->
      <!-- eslint-disable-next-line svelte/no-at-html-tags -->
      {@html e.html}
    </div>
  </div>
</article>
