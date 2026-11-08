<script lang="ts">
  import { enhance } from "$app/forms"
  import Flash from "$lib/components/admin/Flash.svelte"
  import PageHeader from "$lib/components/admin/PageHeader.svelte"

  let { data, form } = $props()
  // svelte-ignore state_referenced_locally
  let a = $state(structuredClone(data.availability))
  let saving = $state(false)
  const DAYS = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ]
  // Monday first, the way most people read a working week.
  const ORDER = [1, 2, 3, 4, 5, 6, 0]
  const nextRange = (rs: { start: string; end: string }[]) => {
    const last = rs[rs.length - 1]
    if (!last) return { start: "09:00", end: "17:00" }
    const h = Math.min(Number(last.end.slice(0, 2)) + 1, 22)
    return {
      start: `${String(h).padStart(2, "0")}:00`,
      end: `${String(h + 1).padStart(2, "0")}:00`,
    }
  }
  const zones = $derived(
    data.zones.includes(a.timezone) ? data.zones : [a.timezone, ...data.zones],
  )
</script>

{#snippet rangeRows(
  ranges: { start: string; end: string }[],
  remove: (i: number) => void,
)}
  {#each ranges as r, i}
    <div class="flex items-center gap-2">
      <input
        class="input input-sm w-32"
        type="time"
        bind:value={r.start}
        aria-label="From"
      />
      <span class="text-sm">to</span>
      <input
        class="input input-sm w-32"
        type="time"
        bind:value={r.end}
        aria-label="Until"
      />
      <button
        type="button"
        class="btn btn-ghost btn-xs"
        onclick={() => remove(i)}>Remove</button
      >
    </div>
  {/each}
{/snippet}

<PageHeader
  title="Availability"
  subtitle="When people can book you. Applies to every event type."
  back="/admin/bookings"
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
  <input type="hidden" name="payload" value={JSON.stringify(a)} />

  <section class="card bg-base-100 border border-base-300">
    <div class="card-body gap-3">
      <h2 class="card-title">Your time zone</h2>
      <select
        class="select w-full max-w-md"
        bind:value={a.timezone}
        aria-label="Your time zone"
      >
        {#each zones as z}<option value={z}>{z.replaceAll("_", " ")}</option
          >{/each}
      </select>
      <p class="text-sm text-base-content/70">
        The hours below are in this zone. Visitors see them converted to theirs,
        and clock changes are handled.
      </p>
    </div>
  </section>

  <section class="card bg-base-100 border border-base-300">
    <div class="card-body gap-4">
      <h2 class="card-title">Weekly hours</h2>
      {#each ORDER as d}
        <div
          class="grid gap-2 border-b border-base-200 pb-4 last:border-0 last:pb-0 sm:grid-cols-[8rem_1fr]"
        >
          <label class="flex items-center gap-2 font-medium">
            <input
              type="checkbox"
              class="checkbox checkbox-sm"
              checked={a.weekly[d].length > 0}
              onchange={(e) =>
                (a.weekly[d] = e.currentTarget.checked ? [nextRange([])] : [])}
            />
            {DAYS[d]}
          </label>
          <div class="space-y-2">
            {#if a.weekly[d].length}
              {@render rangeRows(a.weekly[d], (i) => a.weekly[d].splice(i, 1))}
              {#if a.weekly[d].length < 6}
                <button
                  type="button"
                  class="btn btn-ghost btn-xs"
                  onclick={() => a.weekly[d].push(nextRange(a.weekly[d]))}
                  >Add hours</button
                >
              {/if}
            {:else}<span class="text-sm text-base-content/60">Unavailable</span
              >{/if}
          </div>
        </div>
      {/each}
    </div>
  </section>

  <section class="card bg-base-100 border border-base-300">
    <div class="card-body gap-4">
      <h2 class="card-title">Date overrides</h2>
      <p class="text-sm text-base-content/70">
        Days off and one-off changes. A date with no hours is a day off.
      </p>
      {#each a.overrides as o, i}
        <div
          class="grid gap-2 rounded-box border border-base-300 p-3 sm:grid-cols-[11rem_1fr_auto]"
        >
          <input
            class="input input-sm w-full"
            type="date"
            bind:value={o.date}
            aria-label="Date"
          />
          <div class="space-y-2">
            {#if o.ranges.length}
              {@render rangeRows(o.ranges, (j) => o.ranges.splice(j, 1))}
            {:else}<span class="text-sm text-base-content/60">Day off</span
              >{/if}
            {#if o.ranges.length < 6}
              <button
                type="button"
                class="btn btn-ghost btn-xs"
                onclick={() => o.ranges.push(nextRange(o.ranges))}
                >Add hours</button
              >
            {/if}
          </div>
          <button
            type="button"
            class="btn btn-ghost btn-xs"
            onclick={() => a.overrides.splice(i, 1)}>Delete</button
          >
        </div>
      {/each}
      <button
        type="button"
        class="btn btn-sm w-fit"
        onclick={() =>
          a.overrides.push({
            date: new Date().toISOString().slice(0, 10),
            ranges: [],
          })}>Add a date</button
      >
    </div>
  </section>

  <button class="btn btn-primary btn-sm" disabled={saving}
    >Save availability</button
  >
</form>
