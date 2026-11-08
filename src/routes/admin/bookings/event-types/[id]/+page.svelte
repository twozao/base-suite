<script lang="ts">
  import { enhance } from "$app/forms"
  import Field from "$lib/components/admin/Field.svelte"
  import Flash from "$lib/components/admin/Flash.svelte"
  import ListEditor from "$lib/components/admin/ListEditor.svelte"
  import PageHeader from "$lib/components/admin/PageHeader.svelte"

  let { data, form } = $props()
  // svelte-ignore state_referenced_locally
  let t = $state(structuredClone(data.type)) as (typeof data)["type"] & {
    questions: {
      id: string
      label: string
      kind: "text" | "textarea" | "select"
      required: boolean
      options: string[]
    }[]
  }
  let saving = $state(false)
  // svelte-ignore state_referenced_locally
  let slugEdited = $state(!data.isNew)
  const slugify = (s: string) =>
    s
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 80)
  const nameChanged = () => {
    if (!slugEdited) t.slug = slugify(t.name)
  }
  const newQuestion = () => ({
    id: `q${crypto.randomUUID().slice(0, 8)}`,
    label: "",
    kind: "text" as const,
    required: false,
    options: [],
  })
  const LOCATIONS = [
    ["video", "Video call"],
    ["phone", "Phone call (we ask for their number)"],
    ["in_person", "In person"],
    ["custom", "Other"],
  ]
</script>

{#snippet number(
  label: string,
  key:
    | "durationMinutes"
    | "slotInterval"
    | "bufferBefore"
    | "bufferAfter"
    | "minNoticeMinutes"
    | "maxDaysAhead",
  hint: string,
  min: number,
  max: number,
)}
  <label class="block">
    <span class="mb-1 block text-sm font-medium">{label}</span>
    <input class="input w-full" type="number" {min} {max} bind:value={t[key]} />
    <span class="mt-1 block text-xs text-base-content/60">{hint}</span>
  </label>
{/snippet}

<PageHeader
  title={data.isNew ? "New event type" : t.name}
  back="/admin/bookings/event-types"
/>
<Flash {form} />

<form
  method="POST"
  class="max-w-3xl space-y-6"
  use:enhance={() => {
    saving = true
    return async ({ update }) => {
      await update({ reset: false })
      saving = false
    }
  }}
>
  <input type="hidden" name="payload" value={JSON.stringify(t)} />

  <section class="card bg-base-100 border border-base-300">
    <div class="card-body gap-4">
      <h2 class="card-title">Basics</h2>
      <label class="block">
        <span class="mb-1 block text-sm font-medium">Name</span>
        <input
          class="input w-full"
          bind:value={t.name}
          oninput={nameChanged}
          maxlength="120"
          placeholder="Discovery call"
        />
      </label>
      <label class="block">
        <span class="mb-1 block text-sm font-medium">Link</span>
        <span class="flex items-center gap-2">
          <span class="text-sm text-base-content/60">/book/</span>
          <input
            class="input w-full font-mono text-sm"
            bind:value={t.slug}
            oninput={() => (slugEdited = true)}
            maxlength="80"
          />
        </span>
      </label>
      <Field
        label="Description"
        bind:value={t.description}
        multiline
        rows={2}
        max={1000}
        hint="Shown on the booking page."
      />
      <label class="flex items-center gap-3">
        <input
          type="checkbox"
          class="checkbox checkbox-sm"
          bind:checked={t.active}
        /> Offer this on the booking page
      </label>
    </div>
  </section>

  <section class="card bg-base-100 border border-base-300">
    <div class="card-body gap-4">
      <h2 class="card-title">Where</h2>
      <label class="block">
        <span class="mb-1 block text-sm font-medium">Location</span>
        <select class="select w-full" bind:value={t.locationKind}>
          {#each LOCATIONS as [v, l]}<option value={v}>{l}</option>{/each}
        </select>
      </label>
      <Field
        label="Details"
        bind:value={t.locationDetail}
        max={500}
        placeholder="Your meeting link, address or dial-in"
        hint="Only shown after someone has booked, and in their invite."
      />
    </div>
  </section>

  <section class="card bg-base-100 border border-base-300">
    <div class="card-body gap-4">
      <h2 class="card-title">Timing</h2>
      <div class="grid gap-4 sm:grid-cols-2">
        {@render number(
          "Length (minutes)",
          "durationMinutes",
          "How long the meeting lasts.",
          5,
          480,
        )}
        {@render number(
          "Start times every (minutes)",
          "slotInterval",
          "30 offers 9:00, 9:30, 10:00.",
          5,
          240,
        )}
        {@render number(
          "Buffer before (minutes)",
          "bufferBefore",
          "Free time kept before the meeting.",
          0,
          240,
        )}
        {@render number(
          "Buffer after (minutes)",
          "bufferAfter",
          "Free time kept after the meeting.",
          0,
          240,
        )}
        {@render number(
          "Minimum notice (minutes)",
          "minNoticeMinutes",
          "240 is 4 hours; 1440 is a day.",
          0,
          86400,
        )}
        {@render number(
          "Bookable up to (days ahead)",
          "maxDaysAhead",
          "How far into the future people can book.",
          1,
          365,
        )}
        <label class="block">
          <span class="mb-1 block text-sm font-medium">Daily limit</span>
          <input
            class="input w-full"
            type="number"
            min="1"
            max="100"
            placeholder="No limit"
            value={t.dailyLimit ?? ""}
            oninput={(e) => {
              const v = e.currentTarget.value
              t.dailyLimit = v ? Number(v) : null
            }}
          />
          <span class="mt-1 block text-xs text-base-content/60"
            >Most of this type you will take in a day.</span
          >
        </label>
      </div>
      <p class="text-sm text-base-content/70">
        The hours come from <a class="link" href="/admin/bookings/availability"
          >Availability</a
        >.
      </p>
    </div>
  </section>

  <section class="card bg-base-100 border border-base-300">
    <div class="card-body gap-4">
      <h2 class="card-title">Questions</h2>
      <p class="text-sm text-base-content/70">
        Name and email are always asked. Add anything else you need before the
        meeting.
      </p>
      <ListEditor
        bind:items={t.questions}
        max={10}
        addLabel="Add question"
        create={newQuestion}
        label={(q) => q.label || "New question"}
      >
        {#snippet item(q)}
          <Field label="Question" bind:value={q.label} max={200} />
          <div class="grid gap-3 sm:grid-cols-2 mt-3">
            <label class="block">
              <span class="mb-1 block text-sm font-medium">Answer type</span>
              <select class="select w-full" bind:value={q.kind}>
                <option value="text">Short text</option>
                <option value="textarea">Long text</option>
                <option value="select">Choose one</option>
              </select>
            </label>
            <label class="flex items-center gap-3 sm:mt-7">
              <input
                type="checkbox"
                class="checkbox checkbox-sm"
                bind:checked={q.required}
              /> Required
            </label>
          </div>
          {#if q.kind === "select"}
            <label class="block mt-3">
              <span class="mb-1 block text-sm font-medium"
                >Options, one per line</span
              >
              <textarea
                class="textarea w-full"
                rows="3"
                value={q.options.join("\n")}
                oninput={(e) =>
                  (q.options = e.currentTarget.value
                    .split("\n")
                    .map((s) => s.trim())
                    .filter(Boolean))}
              ></textarea>
            </label>
          {/if}
        {/snippet}
      </ListEditor>
    </div>
  </section>

  <button class="btn btn-primary btn-sm" disabled={saving}
    >{data.isNew ? "Create event type" : "Save changes"}</button
  >
</form>
