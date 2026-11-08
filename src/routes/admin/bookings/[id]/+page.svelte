<script lang="ts">
  import { enhance } from "$app/forms"
  import Flash from "$lib/components/admin/Flash.svelte"
  import PageHeader from "$lib/components/admin/PageHeader.svelte"
  import StatusBadge from "$lib/components/admin/StatusBadge.svelte"
  import { formatDateTime } from "$lib/format"
  let { data, form } = $props()
  const b = $derived(data.booking)
  const keep =
    () =>
    async ({
      update,
    }: {
      update: (o?: { reset?: boolean }) => Promise<void>
    }) =>
      update({ reset: false })
</script>

<PageHeader
  title={b.invitee_name || "Booking"}
  subtitle="{b.event_name} - {formatDateTime(b.start_time)}"
  back="/admin/bookings"
/>
<Flash {form} />

<div class="grid gap-6 lg:grid-cols-3">
  <div class="space-y-6 lg:col-span-2">
    <section class="card bg-base-100 border border-base-300">
      <div class="card-body text-sm">
        <dl class="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2">
          <dt class="opacity-60">Status</dt>
          <dd><StatusBadge status={b.status} /></dd>
          <dt class="opacity-60">Email</dt>
          <dd class="break-all">
            <a class="link" href="mailto:{b.invitee_email}">{b.invitee_email}</a
            >
          </dd>
          {#if b.invitee_phone}<dt class="opacity-60">Phone</dt>
            <dd>
              <a class="link" href="tel:{b.invitee_phone}">{b.invitee_phone}</a>
            </dd>{/if}
          <dt class="opacity-60">Where</dt>
          <dd>{b.location || " - "}</dd>
          <dt class="opacity-60">Their time zone</dt>
          <dd>{b.invitee_timezone ?? " - "}</dd>
          <dt class="opacity-60">Booked</dt>
          <dd>{formatDateTime(b.created_at)}</dd>
          {#if b.cancel_reason}<dt class="opacity-60">Reason</dt>
            <dd>{b.cancel_reason}</dd>{/if}
        </dl>
        {#each data.answers as a}
          <p class="font-medium mt-4">{a.label}</p>
          <p class="opacity-80 whitespace-pre-wrap break-words">{a.value}</p>
        {/each}
      </div>
    </section>
    <form
      method="POST"
      action="?/notes"
      use:enhance={keep}
      class="card bg-base-100 border border-base-300"
    >
      <div class="card-body gap-3">
        <label class="block">
          <span class="mb-1 block text-sm font-medium">Internal notes</span>
          <textarea
            name="admin_notes"
            class="textarea w-full h-28"
            maxlength="10000">{b.admin_notes ?? ""}</textarea
          >
        </label>
        <button class="btn btn-primary btn-sm w-fit">Save notes</button>
      </div>
    </form>
  </div>
  <aside class="space-y-4">
    {#if data.upcoming && b.provider === "native"}
      <a class="btn btn-sm w-full" href="/book/manage/{b.id}/reschedule"
        >Reschedule</a
      >
    {/if}
    {#if data.upcoming}
      <form
        method="POST"
        action="?/cancel"
        use:enhance={keep}
        class="card bg-base-100 border border-base-300"
      >
        <div class="card-body gap-3">
          <label class="block">
            <span class="mb-1 block text-sm font-medium">Reason (optional)</span
            >
            <textarea
              name="reason"
              class="textarea textarea-sm w-full"
              rows="2"
              maxlength="2000"
            ></textarea>
          </label>
          <button class="btn btn-sm btn-outline btn-error"
            >Cancel meeting</button
          >
          <p class="text-xs opacity-60">
            The invitee is told by email if mail is set up.
          </p>
        </div>
      </form>
    {:else if b.status !== "canceled"}
      <form method="POST" action="?/noShow" use:enhance={keep}>
        <button class="btn btn-sm w-full"
          >{b.status === "no_show"
            ? "Remove no-show"
            : "Mark as no-show"}</button
        >
      </form>
    {/if}
  </aside>
</div>
