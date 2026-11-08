<script lang="ts">
  import { enhance } from "$app/forms"
  import PageHeader from "$lib/components/admin/PageHeader.svelte"
  import Flash from "$lib/components/admin/Flash.svelte"
  let { data, form } = $props()
  // svelte-ignore state_referenced_locally
  let body = $state(data.tr.body_md)
</script>

<PageHeader
  title="{data.language}: {data.original.title}"
  back="/admin/translations"
>
  {#snippet actions()}{#if data.tr.published}<a
        class="btn btn-sm"
        href="/{data.locale}{data.original.path}"
        target="_blank">View</a
      >{/if}{/snippet}
</PageHeader>
<Flash {form} />
<div class="grid gap-6 lg:grid-cols-2">
  <section class="card bg-base-200/50 border border-base-300">
    <div class="card-body gap-2">
      <h2 class="font-semibold text-sm opacity-70">Original</h2>
      <p class="font-semibold">{data.original.title}</p>
      {#if data.original.excerpt}<p class="text-sm">
          {data.original.excerpt}
        </p>{/if}
      <pre
        class="whitespace-pre-wrap text-sm font-sans max-h-[60vh] overflow-y-auto">{data
          .original.text}</pre>
    </div>
  </section>
  <form
    method="POST"
    use:enhance={() =>
      async ({ update }) =>
        update({ reset: false })}
    class="card bg-base-100 border border-base-300"
  >
    <div class="card-body gap-2">
      <label class="text-sm"
        >Title<input
          name="title"
          class="input input-sm w-full"
          maxlength="200"
          value={data.tr.title}
          required
        /></label
      >
      <label class="text-sm"
        >Excerpt<textarea
          name="excerpt"
          class="textarea textarea-sm w-full h-16"
          maxlength="500">{data.tr.excerpt ?? ""}</textarea
        ></label
      >
      <label class="text-sm"
        >Text (Markdown)<textarea
          name="body_md"
          class="textarea w-full min-h-80 font-mono text-sm"
          maxlength="200000"
          bind:value={body}
        ></textarea></label
      >
      {#if !body}<button
          type="button"
          class="btn btn-xs w-fit"
          onclick={() => (body = data.original.text)}
          >Start from the original text</button
        >{/if}
      <label class="flex items-center gap-2 text-sm"
        ><input
          type="checkbox"
          name="published"
          class="checkbox checkbox-xs"
          checked={!!data.tr.published}
        /> Live on the site</label
      >
      <button class="btn btn-primary btn-sm w-fit">Save translation</button>
    </div>
  </form>
</div>
