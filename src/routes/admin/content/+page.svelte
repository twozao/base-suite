<script lang="ts">
  import PageHeader from "$lib/components/admin/PageHeader.svelte"
  let { data } = $props()
</script>

<PageHeader title="Content" subtitle="Entries of your content types.">
  {#snippet actions()}{#if data.canDefine}<a
        class="btn btn-sm"
        href="/admin/content-types">Content types</a
      >{/if}{/snippet}
</PageHeader>
{#if !data.types.length}
  <p class="opacity-70">
    No content types yet.{#if data.canDefine}
      <a class="link" href="/admin/content-types/new">Create one</a> or install
      one from <a class="link" href="/admin/extensions">Extensions</a>.{/if}
  </p>
{:else}
  <ul class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
    {#each data.types as t (t.id)}
      <li class="card bg-base-100 border border-base-300">
        <a class="card-body" href="/admin/content/{t.slug}">
          <h2 class="card-title text-base">{t.name}</h2>
          {#if t.description}<p class="text-sm opacity-70">
              {t.description}
            </p>{/if}
          <p class="font-mono text-xs opacity-60">/{t.url_prefix}</p>
        </a>
      </li>
    {/each}
  </ul>
{/if}
