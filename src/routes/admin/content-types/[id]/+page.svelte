<script lang="ts">
  import { enhance } from "$app/forms"
  import PageHeader from "$lib/components/admin/PageHeader.svelte"
  import Flash from "$lib/components/admin/Flash.svelte"
  import FieldEditor from "$lib/components/admin/FieldEditor.svelte"
  let { data, form } = $props()
  const t = $derived(data.type)
  const errors = $derived(
    (form && "errors" in form ? form.errors : {}) as Record<string, string>,
  )
  const values = $derived(
    form && "values" in form && form.values ? form.values : null,
  )

  // svelte-ignore state_referenced_locally
  let fields = $state(
    values?.fields ? JSON.parse(values.fields) : (t?.fields ?? []),
  )
  // svelte-ignore state_referenced_locally
  let name = $state(values?.name ?? t?.name ?? "")
  // svelte-ignore state_referenced_locally
  let slug = $state(values?.slug ?? t?.slug ?? "")
  // svelte-ignore state_referenced_locally
  let prefix = $state(values?.url_prefix ?? t?.url_prefix ?? "")
  const auto = (v: string) =>
    v
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60)
  function onName() {
    if (!t) {
      slug = auto(name).replace(/-/g, "_")
      prefix = auto(name)
    }
  }
</script>

<PageHeader title={t ? t.name : "New content type"} back="/admin/content-types">
  {#snippet actions()}{#if t}<a
        class="btn btn-sm"
        href="/admin/content/{t.slug}">Entries</a
      >{/if}{/snippet}
</PageHeader>
{#if data.saved && !form}<div role="status" class="alert alert-success mb-4">
    <span>Content type created. Add entries from Entries.</span>
  </div>{/if}
<Flash
  form={form && ("message" in form || "error" in form)
    ? (form as { message?: string; error?: string })
    : null}
/>

<form
  method="POST"
  action="?/save"
  use:enhance={() =>
    async ({ update }) =>
      update({ reset: false })}
  class="grid gap-6 lg:grid-cols-[1fr_22rem]"
>
  <input type="hidden" name="fields" value={JSON.stringify(fields)} />
  <section class="card bg-base-100 border border-base-300">
    <div class="card-body gap-3">
      <h2 class="card-title text-base">Fields</h2>
      <p class="text-sm opacity-70">
        Every entry gets a title, URL, excerpt, body and SEO settings. Add the
        extra fields this kind of content needs.
      </p>
      {#if errors.fields}<p class="text-error text-sm" role="alert">
          {errors.fields}
        </p>{/if}
      <FieldEditor bind:fields labels={data.labels} types={data.others} />
    </div>
  </section>
  <aside class="space-y-4">
    <div class="card bg-base-100 border border-base-300">
      <div class="card-body gap-3">
        <label class="block text-sm"
          >Name (plural)
          <input
            name="name"
            class="input input-sm w-full {errors.name ? 'input-error' : ''}"
            maxlength="80"
            bind:value={name}
            oninput={onName}
            placeholder="Case studies"
            required
          />
          {#if errors.name}<span class="text-error text-xs">{errors.name}</span
            >{/if}
        </label>
        <label class="block text-sm"
          >Singular name
          <input
            name="singular"
            class="input input-sm w-full"
            maxlength="80"
            value={values?.singular ?? t?.singular ?? ""}
            placeholder="Case study"
            required
          />
          {#if errors.singular}<span class="text-error text-xs"
              >{errors.singular}</span
            >{/if}
        </label>
        <label class="block text-sm"
          >Internal name
          <input
            name="slug"
            class="input input-sm w-full font-mono"
            maxlength="60"
            bind:value={slug}
          />
          {#if errors.slug}<span class="text-error text-xs">{errors.slug}</span
            >{/if}
        </label>
        <label class="block text-sm"
          >URL
          <div class="join w-full">
            <span class="join-item btn btn-sm btn-disabled">/</span>
            <input
              name="url_prefix"
              class="join-item input input-sm w-full font-mono {errors.url_prefix
                ? 'input-error'
                : ''}"
              maxlength="60"
              bind:value={prefix}
            />
          </div>
          {#if errors.url_prefix}<span class="text-error text-xs"
              >{errors.url_prefix}</span
            >{/if}
        </label>
        <label class="block text-sm"
          >Description
          <textarea
            name="description"
            class="textarea textarea-sm w-full h-16"
            maxlength="500"
            >{values?.description ?? t?.description ?? ""}</textarea
          >
        </label>
        <label class="flex items-center gap-2 text-sm"
          ><input
            type="checkbox"
            name="has_archive"
            class="checkbox checkbox-xs"
            checked={values ? !!values.has_archive : (t?.has_archive ?? true)}
          />
          List page at /{prefix || "..."}</label
        >
        <label class="flex items-center gap-2 text-sm"
          ><input
            type="checkbox"
            name="in_search"
            class="checkbox checkbox-xs"
            checked={values ? !!values.in_search : (t?.in_search ?? true)}
          /> Include in site search</label
        >
        {#if errors._}<p class="text-error text-sm">{errors._}</p>{/if}
        <button class="btn btn-primary btn-sm">Save content type</button>
      </div>
    </div>
  </aside>
</form>

{#if t}
  <form
    method="POST"
    action="?/delete"
    use:enhance
    class="card bg-base-100 border border-error/30 mt-6 max-w-md"
  >
    <div class="card-body gap-2">
      <h2 class="card-title text-base">Delete</h2>
      <p class="text-sm opacity-70">Deletes the type and all its entries.</p>
      <input
        name="confirm"
        class="input input-sm w-full"
        placeholder="Type {t.slug} to confirm"
        autocomplete="off"
      />
      <button class="btn btn-sm btn-error">Delete content type</button>
    </div>
  </form>
{/if}
