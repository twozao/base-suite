<script lang="ts">
  import { enhance } from "$app/forms"
  import PageHeader from "$lib/components/admin/PageHeader.svelte"
  import Flash from "$lib/components/admin/Flash.svelte"
  import { formatDateTime } from "$lib/format"
  let { data, form } = $props()
  const r = $derived(data.request)
</script>

<PageHeader
  title="{r.first_name} {r.last_name}"
  subtitle="Received {formatDateTime(r.created_at)}"
  back="/admin/contact"
/>
<Flash {form} />

<div class="grid gap-6 lg:grid-cols-3">
  <section class="card bg-base-100 border border-base-300 lg:col-span-2">
    <div class="card-body">
      <h2 class="card-title text-base">Message</h2>
      <p class="whitespace-pre-wrap break-words">
        {r.message_body || "(no message)"}
      </p>
      <div class="card-actions mt-4">
        <a
          class="btn btn-primary btn-sm"
          href="mailto:{r.email}?subject={encodeURIComponent(
            `Re: ${r.topic || 'your message'}`,
          )}">Reply by email</a
        >
      </div>
    </div>
  </section>
  <aside class="space-y-6">
    <section class="card bg-base-100 border border-base-300">
      <div class="card-body text-sm">
        <dl class="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2">
          <dt class="opacity-60">Email</dt>
          <dd class="break-all">{r.email}</dd>
          <dt class="opacity-60">Phone</dt>
          <dd>{r.phone || " - "}</dd>
          <dt class="opacity-60">Company</dt>
          <dd>{r.company_name || " - "}</dd>
          <dt class="opacity-60">Topic</dt>
          <dd>{r.topic || " - "}</dd>
          <dt class="opacity-60">Prefers</dt>
          <dd>{r.preferred_contact || " - "}</dd>
          <dt class="opacity-60">Came from</dt>
          <dd class="break-all">{r.source_path || " - "}</dd>
        </dl>
      </div>
    </section>
    <form
      method="POST"
      action="?/update"
      use:enhance={() =>
        async ({ update }) =>
          update({ reset: false })}
      class="card bg-base-100 border border-base-300"
    >
      <div class="card-body gap-3">
        <label class="w-full">
          <span class="label text-sm whitespace-normal mb-1">Status</span>
          <select
            name="status"
            class="select select-sm w-full"
            value={r.status}
          >
            {#each ["new", "open", "closed", "spam"] as s}<option value={s}
                >{s}</option
              >{/each}
          </select>
        </label>
        <label class="w-full">
          <span class="label text-sm whitespace-normal mb-1"
            >Internal notes</span
          >
          <textarea
            name="admin_notes"
            class="textarea textarea-sm w-full h-32"
            maxlength="10000">{r.admin_notes ?? ""}</textarea
          >
        </label>
        <button class="btn btn-primary btn-sm">Save</button>
      </div>
    </form>
  </aside>
</div>
