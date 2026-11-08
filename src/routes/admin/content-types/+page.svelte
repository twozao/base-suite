<script lang="ts">
  import PageHeader from "$lib/components/admin/PageHeader.svelte"
  let { data } = $props()
</script>

<PageHeader
  title="Content types"
  subtitle="Your own kinds of content, like case studies, team members or locations, each with its own fields and URL."
>
  {#snippet actions()}<a
      class="btn btn-primary btn-sm"
      href="/admin/content-types/new">New content type</a
    >{/snippet}
</PageHeader>

{#if !data.types.length}
  <div class="card bg-base-100 border border-base-300">
    <div class="card-body">
      <p>
        No content types yet. Create one, or install a ready-made one from <a
          class="link"
          href="/admin/extensions">Extensions</a
        >.
      </p>
    </div>
  </div>
{:else}
  <div class="overflow-x-auto rounded-box border border-base-300 bg-base-100">
    <table class="table">
      <thead
        ><tr
          ><th>Name</th><th>URL</th><th>Fields</th><th>Entries</th><th></th></tr
        ></thead
      >
      <tbody>
        {#each data.types as t (t.id)}
          <tr>
            <td class="font-medium"
              >{t.name}{#if t.extension_id}<span
                  class="badge badge-ghost badge-sm ml-2">extension</span
                >{/if}</td
            >
            <td class="font-mono text-sm">/{t.url_prefix}</td>
            <td>{t.fields.length}</td>
            <td
              ><a class="link" href="/admin/content/{t.slug}">{t.entries}</a
              ></td
            >
            <td class="text-right"
              ><a class="btn btn-xs" href="/admin/content-types/{t.id}">Edit</a
              ></td
            >
          </tr>
        {/each}
      </tbody>
    </table>
  </div>
{/if}
