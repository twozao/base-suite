<script lang="ts">
  import { enhance } from "$app/forms"
  import SeoHead from "$lib/components/site/SeoHead.svelte"
  let { data, form } = $props()
  const f = $derived(data.form)
  const err = (id: string) =>
    form && "errors" in form
      ? (form.errors as Record<string, string>)[id]
      : undefined
  const val = (id: string) =>
    form && "values" in form
      ? ((form.values as Record<string, string>)[id] ?? "")
      : ""
</script>

<SeoHead
  title={f.title}
  siteName={data.site.brand.siteName}
  description={f.description}
/>
<section class="mx-auto max-w-2xl px-4 sm:px-6 py-16">
  <h1 class="text-3xl sm:text-4xl font-bold">{f.title}</h1>
  {#if f.description}<p class="mt-3 text-base-content/70 whitespace-pre-line">
      {f.description}
    </p>{/if}
  {#if form && "sent" in form}
    <div role="status" class="alert alert-success mt-8">
      <span>{form.message}</span>
    </div>
  {:else}
    <form method="POST" use:enhance class="mt-8 space-y-4">
      <label class="hidden" aria-hidden="true"
        >Website<input
          name="website_url"
          tabindex="-1"
          autocomplete="off"
        /></label
      >
      {#each f.fields as q (q.id)}
        <div>
          {#if q.kind === "checkbox"}
            <label class="flex items-start gap-2"
              ><input
                type="checkbox"
                name={q.id}
                class="checkbox checkbox-sm mt-0.5"
                checked={!!val(q.id)}
              /> <span>{q.label}{q.required ? " *" : ""}</span></label
            >
          {:else if q.kind === "radio"}
            <fieldset>
              <legend class="mb-1 font-medium"
                >{q.label}{q.required ? " *" : ""}</legend
              >
              {#each q.options as o (o)}<label class="flex items-center gap-2"
                  ><input
                    type="radio"
                    name={q.id}
                    value={o}
                    class="radio radio-sm"
                    checked={val(q.id) === o}
                  />
                  {o}</label
                >{/each}
            </fieldset>
          {:else}
            <label for="q-{q.id}" class="mb-1 block font-medium"
              >{q.label}{q.required ? " *" : ""}</label
            >
            {#if q.kind === "textarea"}
              <textarea
                id="q-{q.id}"
                name={q.id}
                class="textarea w-full h-32"
                maxlength="5000"
                required={q.required}>{val(q.id)}</textarea
              >
            {:else if q.kind === "select"}
              <select
                id="q-{q.id}"
                name={q.id}
                class="select w-full"
                required={q.required}
                value={val(q.id)}
                ><option value="">Choose...</option
                >{#each q.options as o (o)}<option value={o}>{o}</option
                  >{/each}</select
              >
            {:else}
              <input
                id="q-{q.id}"
                name={q.id}
                class="input w-full"
                required={q.required}
                value={val(q.id)}
                maxlength="5000"
                type={q.kind === "email"
                  ? "email"
                  : q.kind === "phone"
                    ? "tel"
                    : q.kind === "number"
                      ? "number"
                      : q.kind === "date"
                        ? "date"
                        : "text"}
              />
            {/if}
          {/if}
          {#if q.help}<p class="mt-1 text-sm text-base-content/60">
              {q.help}
            </p>{/if}
          {#if err(q.id)}<p class="mt-1 text-sm text-error">{err(q.id)}</p>{/if}
        </div>
      {/each}
      {#if err("_")}<p class="text-error" role="alert">{err("_")}</p>{/if}
      <button class="btn btn-primary">{f.submit_label}</button>
    </form>
  {/if}
</section>
