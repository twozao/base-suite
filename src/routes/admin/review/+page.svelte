<script lang="ts">
  import { enhance } from "$app/forms"
  import PageHeader from "$lib/components/admin/PageHeader.svelte"
  import Flash from "$lib/components/admin/Flash.svelte"
  import { formatDateTime } from "$lib/format"
  let { data, form } = $props()
</script>

<PageHeader
  title="Review queue"
  subtitle="Drafts that contributors and authors sent for an editor to check and publish."
/>
<Flash {form} />
{#if !data.items.length}
  <p class="opacity-70">Nothing waiting for review.</p>
{:else}
  <ul class="space-y-3 max-w-3xl">
    {#each data.items as i (i.id)}
      <li class="card bg-base-100 border border-base-300">
        <div class="card-body gap-2">
          <div class="flex flex-wrap items-center justify-between gap-2">
            <span
              ><span class="badge badge-ghost badge-sm">{i.label}</span>
              <strong>{i.title}</strong></span
            >
            <a class="btn btn-primary btn-sm" href={i.edit}>Open to publish</a>
          </div>
          <p class="text-xs opacity-60">
            From {i.by}, {formatDateTime(String(i.review_requested_at))}
          </p>
          {#if i.review_note}<p class="text-sm rounded bg-base-200 p-2">
              {i.review_note}
            </p>{/if}
          <form
            method="POST"
            action="?/sendBack"
            use:enhance
            class="flex gap-2"
          >
            <input type="hidden" name="kind" value={i.kind} /><input
              type="hidden"
              name="id"
              value={i.id}
            />
            <input
              name="note"
              class="input input-sm grow"
              placeholder="What to change (optional)"
              maxlength="900"
            />
            <button class="btn btn-sm">Send back</button>
          </form>
        </div>
      </li>
    {/each}
  </ul>
{/if}
