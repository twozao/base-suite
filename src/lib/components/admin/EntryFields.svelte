<script lang="ts">
  // Inputs for a content type's own fields, named field_<key> for the server.
  import ImageField from "./ImageField.svelte"
  type Field = {
    key: string
    label: string
    type: string
    required: boolean
    help: string
    options: string[]
    relation: string
  }
  let {
    fields,
    values,
    errors = {},
    relations = {},
    sortOrder = "0",
  }: {
    fields: Field[]
    values: Record<string, string>
    errors?: Record<string, string>
    relations?: Record<string, { id: string; title: string }[]>
    sortOrder?: string
  } = $props()
  // svelte-ignore state_referenced_locally
  let images: Record<string, string> = $state(
    Object.fromEntries(
      fields
        .filter((f) => f.type === "image")
        .map((f) => [f.key, values[f.key] ?? ""]),
    ),
  )
</script>

{#each fields as f (f.key)}
  {@const name = `field_${f.key}`}
  {@const err = errors[name]}
  <div class="block text-sm">
    {#if f.type === "image"}
      <ImageField
        label={f.label + (f.required ? " *" : "")}
        bind:value={images[f.key]}
      />
      <input type="hidden" {name} value={images[f.key]} />
    {:else if f.type === "boolean"}
      <label class="flex items-center gap-2"
        ><input
          type="checkbox"
          {name}
          class="checkbox checkbox-sm"
          checked={values[f.key] === "1" || values[f.key] === "true"}
        />
        {f.label}</label
      >
    {:else}
      <label for={name} class="mb-1 block font-medium"
        >{f.label}{f.required ? " *" : ""}</label
      >
      {#if f.type === "textarea" || f.type === "markdown"}
        <textarea
          id={name}
          {name}
          class="textarea textarea-sm w-full h-24 {f.type === 'markdown'
            ? 'font-mono'
            : ''} {err ? 'textarea-error' : ''}"
          maxlength="20000">{values[f.key] ?? ""}</textarea
        >
      {:else if f.type === "select"}
        <select
          id={name}
          {name}
          class="select select-sm w-full {err ? 'select-error' : ''}"
          value={values[f.key] ?? ""}
        >
          <option value="">-</option>
          {#each f.options as o (o)}<option value={o}>{o}</option>{/each}
        </select>
      {:else if f.type === "relation"}
        <select
          id={name}
          {name}
          class="select select-sm w-full {err ? 'select-error' : ''}"
          value={values[f.key] ?? ""}
        >
          <option value="">-</option>
          {#each relations[f.relation] ?? [] as r (r.id)}<option value={r.id}
              >{r.title}</option
            >{/each}
        </select>
      {:else}
        <input
          id={name}
          {name}
          class="input input-sm w-full {err ? 'input-error' : ''}"
          type={f.type === "number"
            ? "number"
            : f.type === "date"
              ? "date"
              : "text"}
          step={f.type === "number" ? "any" : undefined}
          maxlength={f.type === "link" ? 1000 : 300}
          value={values[f.key] ?? ""}
          placeholder={f.type === "link" ? "/contact_us or https://..." : ""}
        />
      {/if}
    {/if}
    {#if f.help}<span class="text-xs opacity-60">{f.help}</span>{/if}
    {#if err}<span class="block text-error text-xs">{err}</span>{/if}
  </div>
{/each}
<label class="block text-sm"
  >Order in lists
  <input
    name="sort_order"
    type="number"
    class="input input-sm w-full"
    value={sortOrder}
  />
  <span class="text-xs opacity-60"
    >Lower numbers come first; equal numbers sort by date.</span
  >
</label>
