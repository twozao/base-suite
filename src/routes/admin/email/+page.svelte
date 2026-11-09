<script lang="ts">
  import PageHeader from "$lib/components/admin/PageHeader.svelte"
  import { formatDateTime } from "$lib/format"
  import EmailTabs from "./EmailTabs.svelte"
  let { data } = $props()
  const badge = (s: string) =>
    s === "sent"
      ? "badge-success"
      : s === "failed"
        ? "badge-error"
        : "badge-ghost"
</script>

<PageHeader
  title="Email"
  subtitle="Every email the site sends is logged here for 90 days, with its template and whether it went out."
/>
<EmailTabs />

{#if !data.provider.configured}
  <div role="alert" class="alert alert-warning mb-4">
    <span
      >No email provider is set, so emails are logged as skipped and not sent.
      Set PRIVATE_RESEND_API_KEY and PRIVATE_FROM_EMAIL to send.</span
    >
  </div>
{:else}
  <p class="text-sm opacity-70 mb-4">
    Sending through Resend from {data.provider.from || "no sender set"}.
  </p>
{/if}

<form method="GET" class="flex flex-wrap gap-2 mb-4 items-end">
  <label class="text-sm"
    >Search<input
      name="q"
      value={data.q}
      class="input input-sm w-56"
      placeholder="Address or subject"
      maxlength="100"
    /></label
  >
  <label class="text-sm"
    >Status<select name="status" class="select select-sm w-36">
      <option value="">All</option>
      {#each ["sent", "failed", "skipped"] as s (s)}
        <option value={s} selected={data.status === s}
          >{s} ({data.counts[s] ?? 0})</option
        >
      {/each}
    </select></label
  >
  <button class="btn btn-sm">Filter</button>
</form>

<div class="overflow-x-auto rounded-box border border-base-300 bg-base-100">
  <table class="table table-sm">
    <thead
      ><tr
        ><th>When</th><th>To</th><th>Subject</th><th>Template</th><th>Status</th
        ></tr
      ></thead
    >
    <tbody>
      {#each data.rows as r (r.id)}
        <tr>
          <td class="whitespace-nowrap text-xs"
            >{formatDateTime(r.created_at)}</td
          >
          <td class="max-w-48 truncate" title={r.to_email}>{r.to_email}</td>
          <td class="min-w-56">
            <details>
              <summary class="cursor-pointer">{r.subject}</summary>
              <div class="mt-2 space-y-1 text-xs">
                {#if r.error}<p class="text-error">{r.error}</p>{/if}
                <p class="opacity-60">
                  {r.source === "admin"
                    ? `Sent by ${r.sent_by_email ?? "a staff member"}`
                    : r.source === "test"
                      ? `Test by ${r.sent_by_email ?? "a staff member"}`
                      : "Sent by the site"}{r.provider_id
                    ? `, provider id ${r.provider_id}`
                    : ""}
                </p>
                {#if r.body_text}<pre
                    class="whitespace-pre-wrap rounded bg-base-200 p-2 max-h-64 overflow-auto">{r.body_text}</pre>
                {:else}<p class="opacity-60">
                    The body is not kept for this email.
                  </p>{/if}
              </div>
            </details>
          </td>
          <td class="font-mono text-xs">{r.template ?? "admin alert"}</td>
          <td
            ><span class="badge badge-sm {badge(r.status)}">{r.status}</span
            ></td
          >
        </tr>
      {:else}
        <tr><td colspan="5" class="opacity-60">No emails yet.</td></tr>
      {/each}
    </tbody>
  </table>
</div>
