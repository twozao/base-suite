<script lang="ts">
  import { enhance } from "$app/forms"
  import { onMount, tick } from "svelte"
  import Icon from "$lib/components/site/Icon.svelte"
  import {
    addDays,
    formatInZone,
    localDate,
    weekdayOf,
  } from "$lib/booking/time"

  type Question = {
    id: string
    label: string
    kind: "text" | "textarea" | "select"
    required: boolean
    options: string[]
  }
  type EventInfo = {
    slug: string
    name: string
    description: string
    durationMinutes: number
    locationKind: string
    locationLabel: string
    questions: Question[]
  }
  type FormResult = {
    errors?: Record<string, string>
    error?: string
    taken?: boolean
    values?: Record<string, string>
  } | null

  let {
    type,
    hostName,
    form = null,
    action = "?/book",
    rescheduleParam = null,
    currentTime = null,
    prefill = { name: "", email: "" },
  }: {
    type: EventInfo
    hostName: string
    form?: FormResult
    action?: string
    /** Set when moving an existing meeting: no details step, its own time stays free. */
    rescheduleParam?: string | null
    currentTime?: string | null
    prefill?: { name: string; email: string }
  } = $props()

  const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
  const pad = (n: number) => String(n).padStart(2, "0")

  let timezone = $state("UTC")
  let zones = $state<string[]>([])
  let hour12 = $state(true)
  let ready = $state(false)
  let year = $state(new Date().getFullYear())
  let month = $state(new Date().getMonth())
  let slots = $state<string[]>([])
  let loading = $state(true)
  let loadError = $state("")
  let selectedDate = $state<string | null>(null)
  let selectedSlot = $state<string | null>(null)
  let step = $state<"pick" | "details">("pick")
  let submitting = $state(false)
  let notice = $state("")
  let requestId = 0

  const today = $derived(ready ? localDate(Date.now(), timezone) : "")
  const firstOfMonth = $derived(`${year}-${pad(month + 1)}-01`)
  const daysInMonth = $derived(
    new Date(Date.UTC(year, month + 1, 0)).getUTCDate(),
  )
  const monthLabel = $derived(
    new Intl.DateTimeFormat("en", {
      month: "long",
      year: "numeric",
      timeZone: "UTC",
    }).format(new Date(Date.UTC(year, month, 1))),
  )
  const atCurrentMonth = $derived(
    ready &&
      year === Number(today.slice(0, 4)) &&
      month + 1 === Number(today.slice(5, 7)),
  )
  const cells = $derived([
    ...Array.from({ length: weekdayOf(firstOfMonth) }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => addDays(firstOfMonth, i)),
  ])
  const byDate = $derived.by(() => {
    const map = new Map<string, string[]>()
    for (const iso of slots) {
      const d = localDate(Date.parse(iso), timezone)
      map.set(d, [...(map.get(d) ?? []), iso])
    }
    return map
  })
  const daySlots = $derived(
    selectedDate ? (byDate.get(selectedDate) ?? []) : [],
  )
  const timeLabel = (iso: string) =>
    new Intl.DateTimeFormat("en", {
      hour: "numeric",
      minute: "2-digit",
      hour12,
      timeZone: timezone,
    }).format(new Date(iso))
  const dateLabel = (date: string) =>
    new Intl.DateTimeFormat("en", {
      weekday: "long",
      month: "long",
      day: "numeric",
      timeZone: "UTC",
    }).format(new Date(`${date}T12:00:00Z`))
  const endOf = (iso: string) =>
    new Date(Date.parse(iso) + type.durationMinutes * 60_000).toISOString()

  const load = async () => {
    const id = ++requestId
    loading = true
    loadError = ""
    const from = firstOfMonth
    const to = addDays(firstOfMonth, daysInMonth - 1)
    const q = new URLSearchParams({ event: type.slug, from, to })
    if (rescheduleParam) q.set("reschedule", rescheduleParam)
    try {
      const res = await fetch(`/api/booking/slots?${q}`)
      if (!res.ok) throw new Error(String(res.status))
      const body = (await res.json()) as { slots: string[] }
      if (id !== requestId) return
      slots = body.slots
    } catch {
      if (id !== requestId) return
      loadError = "We could not load the available times. Please try again."
      slots = []
    }
    loading = false
  }

  const shiftMonth = async (by: number) => {
    const d = new Date(Date.UTC(year, month + by, 1))
    year = d.getUTCFullYear()
    month = d.getUTCMonth()
    selectedDate = null
    selectedSlot = null
    await load()
  }

  const selectFirstDay = () => {
    const first = [...byDate.keys()]
      .sort()
      .find((d) => d.startsWith(firstOfMonth.slice(0, 7)))
    selectedDate = first ?? null
    selectedSlot = null
  }

  onMount(async () => {
    timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC"
    const all = Intl.supportedValuesOf?.("timeZone") ?? []
    zones = all.includes(timezone) ? all : [timezone, ...all]
    hour12 =
      new Intl.DateTimeFormat(undefined, { hour: "numeric" }).resolvedOptions()
        .hour12 ?? true
    const now = localDate(Date.now(), timezone)
    year = Number(now.slice(0, 4))
    month = Number(now.slice(5, 7)) - 1
    ready = true
    await load()
    // A month with nothing left, such as the last days of one, should not greet people with an empty calendar.
    for (let i = 0; i < 3 && !loadError && byDateInMonth() === 0; i++)
      await shiftMonth(1)
    selectFirstDay()
  })
  const byDateInMonth = () =>
    [...byDate.keys()].filter((d) => d.startsWith(firstOfMonth.slice(0, 7)))
      .length

  const zoneChanged = () => {
    selectedSlot = null
    if (selectedDate && !byDate.has(selectedDate)) selectFirstDay()
  }

  const goToDetails = async () => {
    step = "details"
    await tick()
    document.getElementById("booking-name")?.focus()
  }
  const value = (k: string, fallback = "") => form?.values?.[k] ?? fallback
  const err = (k: string) => form?.errors?.[k]
</script>

<div
  class="overflow-hidden rounded-box border border-base-300 bg-base-100 shadow-xl"
>
  <div class="grid lg:grid-cols-[18rem_1fr]">
    <aside class="border-b border-base-300 p-6 lg:border-b-0 lg:border-r">
      <p class="text-sm font-medium text-base-content/60">{hostName}</p>
      <h2 class="mt-1 text-2xl font-bold">{type.name}</h2>
      <ul class="mt-4 space-y-2 text-sm text-base-content/80">
        <li class="flex items-center gap-2">
          <Icon name="clock" class="h-4 w-4 shrink-0" />{type.durationMinutes} minutes
        </li>
        <li class="flex items-center gap-2">
          <Icon
            name={type.locationKind === "phone"
              ? "phone"
              : type.locationKind === "in_person"
                ? "pin"
                : "globe"}
            class="h-4 w-4 shrink-0"
          />{type.locationLabel}
        </li>
        {#if selectedSlot && step === "details"}
          <li class="flex items-start gap-2 font-medium text-base-content">
            <Icon name="calendar" class="mt-0.5 h-4 w-4 shrink-0" />
            <span>
              {timeLabel(selectedSlot)} - {timeLabel(endOf(selectedSlot))},
              {dateLabel(localDate(Date.parse(selectedSlot), timezone))}
              <span class="block font-normal text-base-content/60"
                >{timezone.replaceAll("_", " ")}</span
              >
            </span>
          </li>
        {/if}
      </ul>
      {#if currentTime}
        <p class="mt-4 rounded-box bg-base-200 p-3 text-sm">
          <span class="block font-medium">Current time</span>
          {ready
            ? formatInZone(currentTime, timezone, {
                dateStyle: "medium",
                timeStyle: "short",
              })
            : ""}
        </p>
      {/if}
      {#if type.description}
        <p class="mt-4 text-sm leading-relaxed text-base-content/70">
          {type.description}
        </p>
      {/if}
    </aside>

    {#if step === "pick"}
      <div class="p-6">
        <h3 class="text-lg font-semibold">Select a date and time</h3>
        {#if form?.error || notice}
          <p class="mt-3 text-sm text-error" role="alert">
            {notice || form?.error}
          </p>
        {/if}
        <div class="mt-4 grid gap-8 md:grid-cols-[minmax(0,1fr)_13rem]">
          <div>
            <div class="flex items-center justify-between">
              <button
                type="button"
                class="btn btn-ghost btn-sm btn-square"
                aria-label="Previous month"
                disabled={atCurrentMonth || loading}
                onclick={() => shiftMonth(-1)}>&lt;</button
              >
              <span class="font-medium" aria-live="polite">{monthLabel}</span>
              <button
                type="button"
                class="btn btn-ghost btn-sm btn-square"
                aria-label="Next month"
                disabled={loading}
                onclick={() => shiftMonth(1)}>&gt;</button
              >
            </div>
            <div
              class="mt-3 grid grid-cols-7 gap-1 text-center text-xs font-medium text-base-content/60"
              aria-hidden="true"
            >
              {#each WEEKDAYS as d}<span>{d}</span>{/each}
            </div>
            <div
              class="mt-1 grid grid-cols-7 gap-1 {loading ? 'opacity-50' : ''}"
            >
              {#each cells as date}
                {#if date}
                  {@const open = byDate.has(date)}
                  <button
                    type="button"
                    disabled={!open}
                    aria-pressed={selectedDate === date}
                    aria-label="{dateLabel(date)}{open
                      ? ''
                      : ', no times available'}"
                    onclick={() => {
                      selectedDate = date
                      selectedSlot = null
                    }}
                    class="mx-auto grid aspect-square w-full max-w-11 place-items-center rounded-full text-sm transition
                    {selectedDate === date
                      ? 'bg-primary text-primary-content font-semibold'
                      : open
                        ? 'bg-primary/10 text-primary font-semibold hover:bg-primary/20'
                        : 'text-base-content/30'}
                    {date === today && selectedDate !== date
                      ? 'ring-1 ring-base-content/40'
                      : ''}">{Number(date.slice(8))}</button
                  >
                {:else}<span></span>{/if}
              {/each}
            </div>
            <div class="mt-5 flex flex-wrap items-center gap-3 text-sm">
              <label class="flex min-w-0 grow items-center gap-2">
                <Icon name="globe" class="h-4 w-4 shrink-0" />
                <span class="sr-only">Time zone</span>
                <select
                  class="select select-sm min-w-0 grow"
                  bind:value={timezone}
                  onchange={zoneChanged}
                >
                  {#each zones as z}<option value={z}
                      >{z.replaceAll("_", " ")}</option
                    >{/each}
                </select>
              </label>
              <label class="flex cursor-pointer items-center gap-2">
                <input
                  type="checkbox"
                  class="toggle toggle-xs"
                  bind:checked={hour12}
                /> 12h
              </label>
            </div>
          </div>

          <div>
            {#if loadError}
              <p class="text-sm text-error" role="alert">{loadError}</p>
              <button type="button" class="btn btn-sm mt-3" onclick={load}
                >Try again</button
              >
            {:else if loading}
              <p class="text-sm text-base-content/60">Loading times...</p>
            {:else if selectedDate}
              <p class="mb-3 text-sm font-medium">{dateLabel(selectedDate)}</p>
              <ul class="max-h-80 space-y-2 overflow-y-auto pr-1">
                {#each daySlots as iso (iso)}
                  <li class="flex gap-2">
                    <button
                      type="button"
                      aria-pressed={selectedSlot === iso}
                      class="btn btn-sm grow {selectedSlot === iso
                        ? 'btn-neutral'
                        : 'btn-outline btn-primary'}"
                      onclick={() => (selectedSlot = iso)}
                      >{timeLabel(iso)}</button
                    >
                    {#if selectedSlot === iso && !rescheduleParam}
                      <button
                        type="button"
                        class="btn btn-sm btn-primary grow"
                        onclick={goToDetails}>Next</button
                      >
                    {/if}
                  </li>
                {/each}
              </ul>
              {#if rescheduleParam && selectedSlot}
                <form
                  method="POST"
                  {action}
                  class="mt-4"
                  use:enhance={() => {
                    submitting = true
                    return async ({ update, result }) => {
                      await update({ reset: false })
                      submitting = false
                      if (result.type === "failure") await load()
                    }
                  }}
                >
                  <input type="hidden" name="start" value={selectedSlot} />
                  <input type="hidden" name="timezone" value={timezone} />
                  <button
                    class="btn btn-primary btn-sm w-full"
                    disabled={submitting}
                  >
                    {submitting ? "Moving..." : "Move to this time"}
                  </button>
                </form>
              {/if}
            {:else}
              <p class="text-sm text-base-content/60">
                {byDate.size
                  ? "Pick a date to see the times."
                  : "No times available this month. Try the next one."}
              </p>
            {/if}
          </div>
        </div>
      </div>
    {:else if selectedSlot}
      <form
        method="POST"
        {action}
        class="p-6"
        use:enhance={() => {
          submitting = true
          notice = ""
          return async ({ update, result }) => {
            await update({ reset: false })
            submitting = false
            if (result.type === "failure" && result.data?.taken) {
              notice = String(result.data.error ?? "")
              step = "pick"
              selectedSlot = null
              await load()
              if (selectedDate && !byDate.has(selectedDate)) selectFirstDay()
            }
          }
        }}
      >
        <button
          type="button"
          class="btn btn-ghost btn-sm -ml-2"
          onclick={() => (step = "pick")}>Back</button
        >
        <h3 class="mt-2 text-lg font-semibold">Enter your details</h3>
        <input type="hidden" name="start" value={selectedSlot} />
        <input type="hidden" name="timezone" value={timezone} />
        <div class="hidden" aria-hidden="true">
          <label
            >Leave this empty <input
              type="text"
              name="website_url"
              tabindex="-1"
              autocomplete="off"
            /></label
          >
        </div>
        <div class="mt-4 max-w-md space-y-4">
          {#snippet problem(k: string)}
            {#if err(k)}<span
                id="{k}-error"
                class="mt-1 block text-sm text-error">{err(k)}</span
              >{/if}
          {/snippet}
          <label class="block">
            <span class="mb-1 block text-sm font-medium">Your name *</span>
            <input
              id="booking-name"
              name="name"
              class="input w-full {err('name') ? 'input-error' : ''}"
              autocomplete="name"
              required
              maxlength="200"
              value={value("name", prefill.name)}
              aria-invalid={!!err("name")}
              aria-describedby={err("name") ? "name-error" : undefined}
            />
            {@render problem("name")}
          </label>
          <label class="block">
            <span class="mb-1 block text-sm font-medium">Email *</span>
            <input
              name="email"
              type="email"
              class="input w-full {err('email') ? 'input-error' : ''}"
              autocomplete="email"
              required
              maxlength="320"
              value={value("email", prefill.email)}
              aria-invalid={!!err("email")}
              aria-describedby={err("email") ? "email-error" : undefined}
            />
            {@render problem("email")}
          </label>
          {#if type.locationKind === "phone"}
            <label class="block">
              <span class="mb-1 block text-sm font-medium">Phone number *</span>
              <input
                name="phone"
                type="tel"
                class="input w-full {err('phone') ? 'input-error' : ''}"
                autocomplete="tel"
                required
                maxlength="60"
                value={value("phone")}
                aria-invalid={!!err("phone")}
                aria-describedby={err("phone") ? "phone-error" : undefined}
              />
              {@render problem("phone")}
            </label>
          {/if}
          {#each type.questions as q (q.id)}
            {@const name = `q_${q.id}`}
            <label class="block">
              <span class="mb-1 block text-sm font-medium"
                >{q.label}{q.required ? " *" : ""}</span
              >
              {#if q.kind === "textarea"}
                <textarea
                  {name}
                  class="textarea w-full {err(name) ? 'textarea-error' : ''}"
                  rows="3"
                  required={q.required}
                  maxlength="2000"
                  aria-invalid={!!err(name)}
                  aria-describedby={err(name) ? `${name}-error` : undefined}
                  >{value(name)}</textarea
                >
              {:else if q.kind === "select"}
                <select
                  {name}
                  class="select w-full {err(name) ? 'select-error' : ''}"
                  required={q.required}
                  value={value(name)}
                  aria-invalid={!!err(name)}
                  aria-describedby={err(name) ? `${name}-error` : undefined}
                >
                  <option value="">Choose...</option>
                  {#each q.options as o}<option value={o}>{o}</option>{/each}
                </select>
              {:else}
                <input
                  {name}
                  class="input w-full {err(name) ? 'input-error' : ''}"
                  required={q.required}
                  maxlength="2000"
                  value={value(name)}
                  aria-invalid={!!err(name)}
                  aria-describedby={err(name) ? `${name}-error` : undefined}
                />
              {/if}
              {@render problem(name)}
            </label>
          {/each}
          <label class="block">
            <span class="mb-1 block text-sm font-medium"
              >Anything else we should know?</span
            >
            <textarea
              name="notes"
              class="textarea w-full"
              rows="2"
              maxlength="2000">{value("notes")}</textarea
            >
          </label>
          {#if form?.error}<p class="text-sm text-error" role="alert">
              {form.error}
            </p>{/if}
          <button class="btn btn-primary" disabled={submitting}>
            {submitting ? "Booking..." : "Confirm booking"}
          </button>
        </div>
      </form>
    {/if}
  </div>
</div>
<noscript>
  <p class="mt-4 text-sm">
    The calendar needs JavaScript. You can <a class="link" href="/contact_us"
      >send us a message</a
    > instead.
  </p>
</noscript>
