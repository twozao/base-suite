<script lang="ts">
  import { enhance } from "$app/forms"
  import { page } from "$app/stores"
  import Icon from "$lib/components/site/Icon.svelte"
  import { formatInZone } from "$lib/booking/time"
  let { data, form } = $props()
  const b = $derived(data.booking)
  let confirming = $state(false)
  const justBooked = $derived($page.url.searchParams.has("booked"))
  const moved = $derived($page.url.searchParams.has("moved"))
  const canceled = $derived(b.status === "canceled")
</script>

<svelte:head>
  <title>Your booking | {data.site.brand.siteName}</title>
  <meta name="robots" content="noindex" />
</svelte:head>

<section class="bg-brand-glow">
  <div class="mx-auto max-w-2xl px-4 sm:px-6 py-12 sm:py-16">
    <div
      class="rounded-box border border-base-300 bg-base-100 p-6 sm:p-8 shadow-xl"
    >
      <span
        class="grid h-12 w-12 place-items-center rounded-full {canceled
          ? 'bg-error/15 text-error'
          : 'bg-success/15 text-success'}"
      >
        <Icon name={canceled ? "close" : "check"} />
      </span>
      <h1 class="mt-4 text-2xl sm:text-3xl font-bold" role="status">
        {#if canceled}This meeting is cancelled
        {:else if justBooked}You are booked
        {:else if moved}Your meeting has moved
        {:else if !data.upcoming}This meeting has passed
        {:else}Your booking{/if}
      </h1>
      {#if justBooked}
        <p class="mt-2 text-base-content/70">
          A confirmation is on its way to {b.inviteeEmail} if email is set up here.
          Keep this page's link to reschedule or cancel.
        </p>
      {/if}

      <dl class="mt-6 grid grid-cols-[auto_1fr] gap-x-4 gap-y-3">
        <dt class="text-base-content/60">
          <Icon name="calendar" class="h-5 w-5" /><span class="sr-only"
            >What</span
          >
        </dt>
        <dd class="font-semibold">{b.eventName}</dd>
        <dt class="text-base-content/60">
          <Icon name="clock" class="h-5 w-5" /><span class="sr-only">When</span>
        </dt>
        <dd class={canceled ? "line-through" : ""}>
          {formatInZone(b.start, b.timezone)}
          <span class="block text-sm text-base-content/60"
            >{b.timezone.replaceAll("_", " ")}</span
          >
        </dd>
        {#if b.location}
          <dt class="text-base-content/60">
            <Icon name="pin" class="h-5 w-5" /><span class="sr-only">Where</span
            >
          </dt>
          <dd>{b.location}</dd>
        {/if}
        <dt class="text-base-content/60">
          <Icon name="users" class="h-5 w-5" /><span class="sr-only">Who</span>
        </dt>
        <dd>
          {b.inviteeName}
          <span class="block text-sm text-base-content/60"
            >{b.inviteeEmail}</span
          >
        </dd>
      </dl>

      {#if b.answers.length}
        <div class="mt-6 border-t border-base-300 pt-4 text-sm">
          {#each b.answers as a}
            <p class="font-medium mt-2">{a.label}</p>
            <p class="text-base-content/70 whitespace-pre-wrap break-words">
              {a.value}
            </p>
          {/each}
        </div>
      {/if}
      {#if canceled && b.cancelReason}
        <p class="mt-4 text-sm text-base-content/70">
          Reason: {b.cancelReason}
        </p>
      {/if}
      {#if form?.error}<p class="mt-4 text-sm text-error" role="alert">
          {form.error}
        </p>{/if}

      {#if data.upcoming}
        <div class="mt-6 flex flex-wrap gap-2 border-t border-base-300 pt-6">
          <a
            class="btn btn-sm btn-primary"
            href={data.googleUrl}
            target="_blank"
            rel="noopener noreferrer">Add to Google Calendar</a
          >
          <a
            class="btn btn-sm"
            href="{$page.url.pathname}/event.ics"
            data-sveltekit-reload
            download="invite.ics">Download invite (.ics)</a
          >
          {#if data.canReschedule}
            <a class="btn btn-sm" href="{$page.url.pathname}/reschedule"
              >Reschedule</a
            >
          {/if}
          <button
            type="button"
            class="btn btn-sm btn-ghost text-error"
            onclick={() => (confirming = !confirming)}
            aria-expanded={confirming}>Cancel meeting</button
          >
        </div>
        {#if confirming}
          <form
            method="POST"
            action="?/cancel"
            use:enhance
            class="mt-4 space-y-3 rounded-box border border-base-300 p-4"
          >
            <label class="block">
              <span class="mb-1 block text-sm font-medium"
                >Reason (optional)</span
              >
              <textarea
                name="reason"
                class="textarea w-full"
                rows="2"
                maxlength="2000"
              ></textarea>
            </label>
            <button class="btn btn-sm btn-error"
              >Yes, cancel this meeting</button
            >
          </form>
        {/if}
      {:else}
        <div class="mt-6 border-t border-base-300 pt-6">
          <a class="btn btn-sm btn-primary" href="/book">Book another time</a>
        </div>
      {/if}
    </div>
  </div>
</section>
