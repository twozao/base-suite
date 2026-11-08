<script lang="ts">
  import { enhance } from "$app/forms"
  import PageHeader from "$lib/components/admin/PageHeader.svelte"
  import Flash from "$lib/components/admin/Flash.svelte"
  let { data, form } = $props()
  const name = (code: string) =>
    data.all.find((l) => l.code === code)?.name ?? code
  let menuLocale = $state("")
  $effect(() => {
    if (!menuLocale && data.others.length) menuLocale = data.others[0]
  })
</script>

<PageHeader
  title="Translations"
  subtitle="Offer the site in more languages. /fr/about shows the French version of /about; anything not translated shows in the main language."
/>
<Flash {form} />

<form
  method="POST"
  action="?/languages"
  use:enhance
  class="card bg-base-100 border border-base-300 mb-6"
>
  <div class="card-body gap-3">
    <h2 class="card-title text-base">Languages</h2>
    <label class="text-sm max-w-xs"
      >Main language
      <select
        name="defaultLocale"
        class="select select-sm w-full"
        value={data.i18n.defaultLocale}
        >{#each data.all as l (l.code)}<option value={l.code}>{l.name}</option
          >{/each}</select
      >
    </label>
    <div class="grid gap-1 grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 text-sm">
      {#each data.all as l (l.code)}<label class="flex items-center gap-2"
          ><input
            type="checkbox"
            name="locales"
            value={l.code}
            class="checkbox checkbox-xs"
            checked={data.i18n.locales.includes(l.code)}
          />
          {l.name}</label
        >{/each}
    </div>
    <button class="btn btn-primary btn-sm w-fit">Save languages</button>
  </div>
</form>

{#if !data.others.length}
  <p class="opacity-70">
    Pick at least one more language to start translating.
  </p>
{:else}
  <section class="mb-8">
    <h2 class="font-semibold mb-2">Pages and posts</h2>
    <div class="overflow-x-auto rounded-box border border-base-300 bg-base-100">
      <table class="table table-sm">
        <thead
          ><tr
            ><th>Title</th>{#each data.others as l (l)}<th>{name(l)}</th
              >{/each}</tr
          ></thead
        >
        <tbody>
          {#each data.items as i (i.kind + i.id)}
            <tr>
              <td
                ><span class="badge badge-ghost badge-xs">{i.kind}</span>
                {i.title}</td
              >
              {#each data.others as l (l)}
                <td
                  ><a
                    class="btn btn-xs {i.status[l] === 'live'
                      ? 'btn-success'
                      : i.status[l] === 'draft'
                        ? 'btn-warning'
                        : ''}"
                    href="/admin/translations/{i.kind}/{i.id}/{l}"
                    >{i.status[l] === "live"
                      ? "Edit"
                      : i.status[l] === "draft"
                        ? "Draft"
                        : "Translate"}</a
                  ></td
                >
              {/each}
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  </section>

  <section class="card bg-base-100 border border-base-300">
    <div class="card-body gap-3">
      <div class="flex flex-wrap items-center gap-3">
        <h2 class="card-title text-base">Menu labels</h2>
        <select
          class="select select-sm"
          bind:value={menuLocale}
          aria-label="Language"
          >{#each data.others as l (l)}<option value={l}>{name(l)}</option
            >{/each}</select
        >
      </div>
      {#key menuLocale}
        <form
          method="POST"
          action="?/menu"
          use:enhance={() =>
            async ({ update }) =>
              update({ reset: false })}
          class="space-y-2"
        >
          <input type="hidden" name="locale" value={menuLocale} />
          {#each data.labels as label (label)}
            <label class="grid gap-2 sm:grid-cols-2 items-center text-sm"
              ><span class="opacity-70">{label}</span><input
                name="label:{label}"
                class="input input-sm w-full"
                value={data.menus[menuLocale]?.[label] ?? ""}
                maxlength="200"
              /></label
            >
          {/each}
          <button class="btn btn-primary btn-sm">Save labels</button>
        </form>
      {/key}
    </div>
  </section>
{/if}
