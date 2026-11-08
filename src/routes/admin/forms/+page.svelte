<script lang="ts">
  import { enhance } from "$app/forms"
  import PageHeader from "$lib/components/admin/PageHeader.svelte"
  import Flash from "$lib/components/admin/Flash.svelte"
  let { data, form } = $props()
</script>

<PageHeader
  title="Forms"
  subtitle="Build forms for applications, quotes or sign-ups. Each has its own page and an inbox of answers."
/>
<Flash {form} />
<form
  method="POST"
  action="?/create"
  use:enhance
  class="mb-6 flex gap-2 max-w-md"
>
  <input
    name="title"
    class="input input-sm grow"
    placeholder="Form title, e.g. Job application"
    maxlength="200"
    required
  />
  <button class="btn btn-primary btn-sm">Create</button>
</form>
<div class="overflow-x-auto rounded-box border border-base-300 bg-base-100">
  <table class="table">
    <thead
      ><tr><th>Form</th><th>Address</th><th>New answers</th><th></th></tr
      ></thead
    >
    <tbody>
      {#each data.forms as f (f.id)}
        <tr>
          <td class="font-medium"
            >{f.title}{#if !f.active}
              <span class="badge badge-ghost badge-sm">off</span>{/if}</td
          >
          <td class="font-mono text-xs">/forms/{f.slug}</td>
          <td>{f.unread}</td>
          <td class="text-right whitespace-nowrap"
            ><a class="btn btn-xs" href="/admin/forms/{f.id}">Edit</a>
            <a class="btn btn-xs" href="/admin/forms/{f.id}/submissions"
              >Answers</a
            ></td
          >
        </tr>
      {:else}<tr><td colspan="4" class="opacity-60">No forms yet.</td></tr
        >{/each}
    </tbody>
  </table>
</div>
