<script lang="ts">
  import { enhance } from "$app/forms"
  import PageHeader from "$lib/components/admin/PageHeader.svelte"
  import Flash from "$lib/components/admin/Flash.svelte"
  import { formatDateTime } from "$lib/format"
  let { data, form } = $props()
</script>

<PageHeader
  title="Answers: {data.form.title}"
  back="/admin/forms/{data.form.id}"
>
  {#snippet actions()}<a
      class="btn btn-sm"
      href="/admin/forms/{data.form.id}/submissions/export.csv">Download CSV</a
    >{/snippet}
</PageHeader>
<Flash {form} />
{#each data.submissions as s (s.id)}
  <div
    class="card bg-base-100 border {s.status === 'new'
      ? 'border-primary/40'
      : 'border-base-300'} mb-3 max-w-3xl"
  >
    <div class="card-body gap-2 py-4">
      <div class="flex items-center justify-between text-sm">
        <span class="opacity-60">{formatDateTime(s.created_at)}</span>
        <span
          class="badge badge-sm {s.status === 'new'
            ? 'badge-primary'
            : 'badge-ghost'}">{s.status}</span
        >
      </div>
      <dl class="grid gap-1 text-sm sm:grid-cols-[12rem_1fr]">
        {#each s.answers as a, i (i)}<dt class="opacity-60">{a.label}</dt>
          <dd class="whitespace-pre-line">{a.value}</dd>{/each}
      </dl>
      <form method="POST" action="?/mark" use:enhance class="flex gap-1">
        <input type="hidden" name="id" value={s.id} />
        {#if s.status !== "read"}<button
            name="to"
            value="read"
            class="btn btn-xs">Mark read</button
          >{/if}
        {#if s.status !== "spam"}<button
            name="to"
            value="spam"
            class="btn btn-xs btn-ghost">Spam</button
          >{/if}
      </form>
    </div>
  </div>
{:else}<p class="opacity-60">No answers yet.</p>{/each}
