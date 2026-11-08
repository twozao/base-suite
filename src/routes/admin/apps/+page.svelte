<script lang="ts">
  import { enhance } from "$app/forms"
  import PageHeader from "$lib/components/admin/PageHeader.svelte"
  import Flash from "$lib/components/admin/Flash.svelte"
  let { data, form } = $props()
  const made = $derived(
    form && "secret" in form
      ? (form as { secret: string; token: string | null; id: string })
      : null,
  )
</script>

<PageHeader
  title="Apps"
  subtitle="Connect code that runs somewhere else, on its own Worker or server. Apps get signed events and a token limited to the permissions you tick. They never run inside this site and never see users, passwords or keys."
/>
<Flash
  form={form && ("message" in form || "error" in form)
    ? (form as { message?: string; error?: string })
    : null}
/>
{#if made}
  <div
    class="alert alert-warning mb-6 max-w-3xl flex-col items-start text-sm"
    data-testid="app-credentials"
  >
    <span>App id: <code>{made.id}</code></span>
    <span>Signing secret: <code class="break-all">{made.secret}</code></span>
    {#if made.token}<span
        >API token: <code class="break-all">{made.token}</code></span
      >{/if}
  </div>
{/if}

{#if data.apps.length}
  <div
    class="overflow-x-auto rounded-box border border-base-300 bg-base-100 mb-8"
  >
    <table class="table">
      <thead
        ><tr
          ><th>App</th><th>Address</th><th>Permissions</th><th>Blocks</th><th
          ></th></tr
        ></thead
      >
      <tbody>
        {#each data.apps as a (a.id)}
          <tr>
            <td class="font-medium"
              >{a.name}{#if !a.enabled}
                <span class="badge badge-ghost badge-sm">off</span>{/if}</td
            >
            <td class="font-mono text-xs">{a.base_url}</td>
            <td class="text-xs">{a.scopes.join(", ") || "none"}</td>
            <td>{a.blocks}</td>
            <td><a class="btn btn-xs" href="/admin/apps/{a.id}">Open</a></td>
          </tr>
        {/each}
      </tbody>
    </table>
  </div>
{/if}

<form
  method="POST"
  action="?/register"
  use:enhance
  class="card bg-base-100 border border-base-300 max-w-3xl"
>
  <div class="card-body gap-3">
    <h2 class="card-title text-base">Connect an app</h2>
    <div class="grid gap-2 sm:grid-cols-2">
      <label class="text-sm"
        >Name<input
          name="name"
          class="input input-sm w-full"
          maxlength="120"
          required
        /></label
      >
      <label class="text-sm"
        >Address (https)<input
          name="base_url"
          class="input input-sm w-full font-mono"
          placeholder="https://my-app.example.workers.dev"
          maxlength="500"
          required
        /></label
      >
      <label class="text-sm"
        >Admin screen path (optional)<input
          name="admin_path"
          class="input input-sm w-full font-mono"
          placeholder="/admin"
          maxlength="200"
        /></label
      >
    </div>
    <p class="text-sm font-medium">What it may do</p>
    <div class="grid gap-1 sm:grid-cols-2">
      {#each Object.entries(data.scopes) as [scope, text] (scope)}<label
          class="flex items-start gap-2 text-sm"
          ><input
            type="checkbox"
            name="scopes"
            value={scope}
            class="checkbox checkbox-xs mt-1"
          /><span
            ><code>{scope}</code>
            <span class="text-xs opacity-60">{text}</span></span
          ></label
        >{/each}
    </div>
    <p class="text-sm font-medium">
      Events sent to its <code>/events</code> address
    </p>
    <div class="grid gap-1 sm:grid-cols-3">
      {#each data.events as e (e)}<label class="flex items-center gap-2 text-sm"
          ><input
            type="checkbox"
            name="events"
            value={e}
            class="checkbox checkbox-xs"
          /><code class="text-xs">{e}</code></label
        >{/each}
    </div>
    <button class="btn btn-primary btn-sm w-fit">Connect</button>
  </div>
</form>
