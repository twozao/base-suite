<script lang="ts">
  import { enhance } from "$app/forms"
  import PageHeader from "$lib/components/admin/PageHeader.svelte"
  import Flash from "$lib/components/admin/Flash.svelte"
  import { formatDateTime } from "$lib/format"
  let { data, form } = $props()
  const s = $derived(data.settings)
</script>

<PageHeader
  title="Comments"
  subtitle="Comments on blog posts. Spam with many links is caught automatically."
/>
<Flash {form} />

<div class="grid gap-6 lg:grid-cols-[1fr_18rem]">
  <div>
    <div role="tablist" class="tabs tabs-border mb-4">
      {#each [["pending", "Waiting"], ["approved", "Approved"], ["spam", "Spam"]] as [k, label] (k)}
        <a
          role="tab"
          class="tab {data.status === k ? 'tab-active' : ''}"
          href="?status={k}">{label} ({data.counts[k] ?? 0})</a
        >
      {/each}
    </div>
    {#each data.comments as c (c.id)}
      <div class="card bg-base-100 border border-base-300 mb-3">
        <div class="card-body gap-2 py-4">
          <p class="text-sm">
            <strong>{c.author_name}</strong>
            {#if c.author_email}<span class="opacity-60">{c.author_email}</span
              >{/if} on
            <a class="link" href="/blog/{c.slug}#comments" target="_blank"
              >{c.title}</a
            > <span class="opacity-60">{formatDateTime(c.created_at)}</span>
          </p>
          <p class="whitespace-pre-line text-sm">{c.body}</p>
          <form
            method="POST"
            action="?/moderate"
            use:enhance
            class="flex flex-wrap gap-1"
          >
            <input type="hidden" name="id" value={c.id} />
            {#if c.status !== "approved"}<button
                name="to"
                value="approved"
                class="btn btn-xs btn-success">Approve</button
              >{/if}
            {#if c.status !== "pending"}<button
                name="to"
                value="pending"
                class="btn btn-xs">Unapprove</button
              >{/if}
            {#if c.status !== "spam"}<button
                name="to"
                value="spam"
                class="btn btn-xs">Spam</button
              >{/if}
            <button
              name="to"
              value="delete"
              class="btn btn-xs btn-ghost text-error">Delete</button
            >
          </form>
        </div>
      </div>
    {:else}<p class="opacity-60">None here.</p>{/each}
  </div>
  <form
    method="POST"
    action="?/settings"
    use:enhance
    class="card bg-base-100 border border-base-300 h-fit"
  >
    <div class="card-body gap-2 text-sm">
      <h2 class="font-semibold">Settings</h2>
      <label class="flex items-center gap-2"
        ><input
          type="checkbox"
          name="enabled"
          class="checkbox checkbox-xs"
          checked={s.enabled}
        /> Allow comments on posts</label
      >
      <label class="flex items-center gap-2"
        ><input
          type="checkbox"
          name="requireApproval"
          class="checkbox checkbox-xs"
          checked={s.requireApproval}
        /> Approve before they show</label
      >
      <label class="flex items-center gap-2"
        ><input
          type="checkbox"
          name="notifyAdmin"
          class="checkbox checkbox-xs"
          checked={s.notifyAdmin}
        /> Email the admin</label
      >
      <label
        >Close after days (0 = never)<input
          name="closeAfterDays"
          type="number"
          min="0"
          max="3650"
          class="input input-sm w-full"
          value={s.closeAfterDays}
        /></label
      >
      <button class="btn btn-primary btn-sm">Save</button>
    </div>
  </form>
</div>
