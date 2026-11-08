<script lang="ts">
  // Edits a content type's field list; the parent posts it as JSON and the server validates it.
  type Field = {
    key: string
    label: string
    type: string
    required: boolean
    help: string
    options: string[]
    relation: string
    showInList: boolean
  }
  let {
    fields = $bindable(),
    labels,
    types,
  }: {
    fields: Field[]
    labels: Record<string, string>
    /** Other content types, for relation fields */
    types: { slug: string; name: string }[]
  } = $props()

  const keyFrom = (label: string) =>
    label
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "")
      .replace(/^(\d)/, "f_$1")
      .slice(0, 40)

  function add() {
    fields = [
      ...fields,
      {
        key: "",
        label: "",
        type: "text",
        required: false,
        help: "",
        options: [],
        relation: "",
        showInList: false,
      },
    ]
  }
  function move(i: number, by: number) {
    const j = i + by
    if (j < 0 || j >= fields.length) return
    const next = [...fields]
    ;[next[i], next[j]] = [next[j], next[i]]
    fields = next
  }
</script>

<div class="space-y-3" data-testid="field-editor">
  {#each fields as f, i (i)}
    <div class="rounded-box border border-base-300 p-3 space-y-2">
      <div class="grid gap-2 sm:grid-cols-3">
        <label class="block text-sm"
          >Label
          <input
            class="input input-sm w-full"
            maxlength="80"
            bind:value={f.label}
            oninput={() => {
              if (!f.key || f.key === keyFrom(f.label.slice(0, -1)))
                f.key = keyFrom(f.label)
            }}
            aria-label="Field {i + 1} label"
          />
        </label>
        <label class="block text-sm"
          >Key
          <input
            class="input input-sm w-full font-mono"
            maxlength="40"
            bind:value={f.key}
            aria-label="Field {i + 1} key"
          />
        </label>
        <label class="block text-sm"
          >Type
          <select
            class="select select-sm w-full"
            bind:value={f.type}
            aria-label="Field {i + 1} type"
          >
            {#each Object.entries(labels) as [value, text] (value)}<option
                {value}>{text}</option
              >{/each}
          </select>
        </label>
      </div>
      {#if f.type === "select"}
        <label class="block text-sm"
          >Choices, one per line
          <textarea
            class="textarea textarea-sm w-full h-20"
            value={f.options.join("\n")}
            oninput={(e) =>
              (f.options = e.currentTarget.value
                .split("\n")
                .map((x) => x.trim())
                .filter(Boolean))}
          ></textarea>
        </label>
      {/if}
      {#if f.type === "relation"}
        <label class="block text-sm"
          >Links to
          <select class="select select-sm w-full" bind:value={f.relation}>
            <option value="">Choose a content type</option>
            {#each types as t (t.slug)}<option value={t.slug}>{t.name}</option
              >{/each}
          </select>
        </label>
      {/if}
      <input
        class="input input-xs w-full"
        placeholder="Help text shown under the field (optional)"
        maxlength="200"
        bind:value={f.help}
      />
      <div class="flex flex-wrap items-center gap-4 text-sm">
        <label class="flex items-center gap-2"
          ><input
            type="checkbox"
            class="checkbox checkbox-xs"
            bind:checked={f.required}
          /> Required</label
        >
        <label class="flex items-center gap-2"
          ><input
            type="checkbox"
            class="checkbox checkbox-xs"
            bind:checked={f.showInList}
          /> Show on list cards</label
        >
        <span class="grow"></span>
        <button
          type="button"
          class="btn btn-ghost btn-xs"
          disabled={i === 0}
          onclick={() => move(i, -1)}>Up</button
        >
        <button
          type="button"
          class="btn btn-ghost btn-xs"
          disabled={i === fields.length - 1}
          onclick={() => move(i, 1)}>Down</button
        >
        <button
          type="button"
          class="btn btn-ghost btn-xs text-error"
          onclick={() => (fields = fields.filter((_, k) => k !== i))}
          >Remove</button
        >
      </div>
    </div>
  {/each}
  <button type="button" class="btn btn-sm" onclick={add}>+ Add field</button>
</div>
