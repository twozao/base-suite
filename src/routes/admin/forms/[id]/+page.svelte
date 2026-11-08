<script lang="ts">
  import { enhance } from "$app/forms"
  import PageHeader from "$lib/components/admin/PageHeader.svelte"
  import Flash from "$lib/components/admin/Flash.svelte"
  let { data, form } = $props()
  const KINDS = {
    text: "Short text",
    email: "Email",
    phone: "Phone",
    textarea: "Long text",
    number: "Number",
    date: "Date",
    select: "Drop-down",
    radio: "Choice buttons",
    checkbox: "Tick box",
  }
  type F = {
    id: string
    label: string
    kind: string
    required: boolean
    help: string
    options: string[]
  }
  // svelte-ignore state_referenced_locally
  let fields: F[] = $state(structuredClone(data.form.fields))
  const key = (label: string) =>
    label
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "")
      .slice(0, 40) || `field_${fields.length + 1}`
  function move(i: number, by: number) {
    const j = i + by
    if (j < 0 || j >= fields.length) return
    const n = [...fields]
    ;[n[i], n[j]] = [n[j], n[i]]
    fields = n
  }
</script>

<PageHeader
  title={data.form.title}
  subtitle="/forms/{data.form.slug}"
  back="/admin/forms"
>
  {#snippet actions()}
    <a class="btn btn-sm" href="/admin/forms/{data.form.id}/submissions"
      >Answers</a
    >
    {#if data.form.active}<a
        class="btn btn-sm"
        href="/forms/{data.form.slug}"
        target="_blank">View</a
      >{/if}
  {/snippet}
</PageHeader>
<Flash {form} />

<form
  method="POST"
  action="?/save"
  use:enhance={() =>
    async ({ update }) =>
      update({ reset: false })}
  class="grid gap-6 lg:grid-cols-[1fr_20rem]"
>
  <input type="hidden" name="fields" value={JSON.stringify(fields)} />
  <section class="space-y-3">
    {#each fields as f, i (i)}
      <div class="card bg-base-100 border border-base-300">
        <div class="card-body gap-2 py-3">
          <div class="grid gap-2 sm:grid-cols-[1fr_10rem_9rem]">
            <input
              class="input input-sm"
              placeholder="Question"
              maxlength="200"
              bind:value={f.label}
              oninput={() => {
                if (!data.form.fields.some((x) => x.id === f.id))
                  f.id = key(f.label)
              }}
              aria-label="Question {i + 1}"
            />
            <select
              class="select select-sm"
              bind:value={f.kind}
              aria-label="Type of question {i + 1}"
              >{#each Object.entries(KINDS) as [v, l] (v)}<option value={v}
                  >{l}</option
                >{/each}</select
            >
            <input
              class="input input-sm font-mono text-xs"
              maxlength="40"
              bind:value={f.id}
              aria-label="Key of question {i + 1}"
            />
          </div>
          {#if f.kind === "select" || f.kind === "radio"}
            <textarea
              class="textarea textarea-sm"
              placeholder="Options, one per line"
              value={f.options.join("\n")}
              oninput={(e) =>
                (f.options = e.currentTarget.value
                  .split("\n")
                  .map((x) => x.trim())
                  .filter(Boolean))}
            ></textarea>
          {/if}
          <input
            class="input input-xs"
            placeholder="Help text (optional)"
            maxlength="300"
            bind:value={f.help}
          />
          <div class="flex items-center gap-3 text-sm">
            <label class="flex items-center gap-2"
              ><input
                type="checkbox"
                class="checkbox checkbox-xs"
                bind:checked={f.required}
              /> Required</label
            >
            <span class="grow"></span>
            <button
              type="button"
              class="btn btn-ghost btn-xs"
              onclick={() => move(i, -1)}
              disabled={i === 0}>Up</button
            >
            <button
              type="button"
              class="btn btn-ghost btn-xs"
              onclick={() => move(i, 1)}
              disabled={i === fields.length - 1}>Down</button
            >
            <button
              type="button"
              class="btn btn-ghost btn-xs text-error"
              onclick={() => (fields = fields.filter((_, k) => k !== i))}
              >Remove</button
            >
          </div>
        </div>
      </div>
    {/each}
    <button
      type="button"
      class="btn btn-sm"
      onclick={() =>
        (fields = [
          ...fields,
          {
            id: `field_${fields.length + 1}`,
            label: "",
            kind: "text",
            required: false,
            help: "",
            options: [],
          },
        ])}>+ Add question</button
    >
  </section>
  <aside class="card bg-base-100 border border-base-300 h-fit">
    <div class="card-body gap-2 text-sm">
      <label
        >Title<input
          name="title"
          class="input input-sm w-full"
          value={data.form.title}
          maxlength="200"
          required
        /></label
      >
      <label
        >Address
        <div class="join w-full">
          <span class="join-item btn btn-sm btn-disabled">/forms/</span><input
            name="slug"
            class="join-item input input-sm w-full font-mono"
            value={data.form.slug}
            maxlength="80"
            required
          />
        </div></label
      >
      <label
        >Intro<textarea
          name="description"
          class="textarea textarea-sm w-full h-16"
          maxlength="1000">{data.form.description}</textarea
        ></label
      >
      <label
        >Button text<input
          name="submit_label"
          class="input input-sm w-full"
          value={data.form.submit_label}
          maxlength="60"
        /></label
      >
      <label
        >Thank-you message<textarea
          name="success_message"
          class="textarea textarea-sm w-full h-16"
          maxlength="500">{data.form.success_message}</textarea
        ></label
      >
      <label class="flex items-center gap-2"
        ><input
          type="checkbox"
          name="notify_admin"
          class="checkbox checkbox-xs"
          checked={data.form.notify_admin}
        /> Email the admin on each answer</label
      >
      <label class="flex items-center gap-2"
        ><input
          type="checkbox"
          name="active"
          class="checkbox checkbox-xs"
          checked={data.form.active}
        /> Live (open to visitors)</label
      >
      <button class="btn btn-primary btn-sm">Save form</button>
    </div>
  </aside>
</form>
<form
  method="POST"
  action="?/delete"
  use:enhance={({ cancel }) => {
    if (!confirm("Delete this form and all its answers?")) cancel()
  }}
  class="mt-6"
>
  <button class="btn btn-sm btn-error btn-outline">Delete form</button>
</form>
