<script lang="ts">
  import { enhance } from "$app/forms"
  import Flash from "$lib/components/admin/Flash.svelte"
  import PageHeader from "$lib/components/admin/PageHeader.svelte"
  let { data, form } = $props()
  let deleting = $state("")
</script>

<PageHeader
  title="Event types"
  subtitle="The kinds of meeting people can book."
  back="/admin/bookings"
>
  {#snippet actions()}
    <a class="btn btn-sm btn-primary" href="/admin/bookings/event-types/new"
      >New event type</a
    >
  {/snippet}
</PageHeader>
<Flash {form} />

<div class="overflow-x-auto bg-base-100 border border-base-300 rounded-box">
  <table class="table">
    <thead
      ><tr
        ><th>Name</th><th>Length</th><th>Where</th><th>Link</th><th>Status</th
        ><th></th></tr
      ></thead
    >
    <tbody>
      {#each data.types as t (t.id)}
        <tr>
          <td
            ><a
              class="link font-medium"
              href="/admin/bookings/event-types/{t.id}">{t.name}</a
            ></td
          >
          <td class="whitespace-nowrap">{t.durationMinutes} min</td>
          <td>{t.location}</td>
          <td
            ><a class="link text-sm" href="/book/{t.slug}" target="_blank"
              >/book/{t.slug}</a
            ></td
          >
          <td>
            <form method="POST" action="?/toggle" use:enhance>
              <input type="hidden" name="id" value={t.id} />
              <button
                class="badge {t.active ? 'badge-success' : 'badge-ghost'}"
                title="Click to switch">{t.active ? "on" : "off"}</button
              >
            </form>
          </td>
          <td class="text-right">
            {#if deleting === t.id}
              <form method="POST" action="?/delete" use:enhance class="inline">
                <input type="hidden" name="id" value={t.id} />
                <button class="btn btn-xs btn-error">Confirm delete</button>
              </form>
            {:else}
              <button
                type="button"
                class="btn btn-xs btn-ghost"
                onclick={() => (deleting = t.id)}>Delete</button
              >
            {/if}
          </td>
        </tr>
      {:else}
        <tr
          ><td colspan="6" class="text-center opacity-60 py-10"
            >No event types yet, so /book has nothing to offer. Create your
            first one.</td
          ></tr
        >
      {/each}
    </tbody>
  </table>
</div>
