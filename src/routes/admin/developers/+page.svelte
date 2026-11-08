<script lang="ts">
  import { enhance } from "$app/forms"
  import PageHeader from "$lib/components/admin/PageHeader.svelte"
  import Flash from "$lib/components/admin/Flash.svelte"
  import { formatDateTime } from "$lib/format"
  let { data, form } = $props()
  const shown = $derived(
    form && "token" in form
      ? form.token
      : form && "secret" in form
        ? form.secret
        : null,
  )
  const keep =
    () =>
    async ({ update }: { update: (o?: { reset: boolean }) => Promise<void> }) =>
      update({ reset: true })
</script>

<PageHeader
  title="API & webhooks"
  subtitle="Let other systems read and change your content, and tell them when something happens."
/>
<Flash
  form={form && ("message" in form || "error" in form)
    ? (form as { message?: string; error?: string })
    : null}
/>
{#if shown}
  <div class="alert alert-warning mb-6 max-w-3xl">
    <code class="break-all font-mono text-sm" data-testid="shown-secret"
      >{shown}</code
    >
  </div>
{/if}

<div class="grid gap-6 xl:grid-cols-2">
  <section class="card bg-base-100 border border-base-300">
    <div class="card-body gap-3">
      <h2 class="card-title text-base">API tokens</h2>
      <p class="text-sm opacity-70">
        Send as <code>Authorization: Bearer bs_...</code> to
        <code>/api/v1/</code>. Published pages, posts and entries can be read
        without a token.
      </p>
      <form
        method="POST"
        action="?/token"
        use:enhance={keep}
        class="space-y-2 rounded-box border border-base-200 p-3"
      >
        <input
          name="name"
          class="input input-sm w-full"
          placeholder="Name, e.g. Mobile app"
          maxlength="120"
          required
        />
        <div class="grid gap-1 sm:grid-cols-2">
          {#each Object.entries(data.scopes) as [scope, text] (scope)}
            <label class="flex items-start gap-2 text-sm"
              ><input
                type="checkbox"
                name="scopes"
                value={scope}
                class="checkbox checkbox-xs mt-1"
              /><span
                ><code>{scope}</code><br /><span class="text-xs opacity-60"
                  >{text}</span
                ></span
              ></label
            >
          {/each}
        </div>
        <button class="btn btn-primary btn-sm">Create token</button>
      </form>
      {#each data.tokens as t (t.id)}
        <div
          class="flex items-center justify-between gap-2 border-b border-base-200 pb-2 text-sm"
        >
          <span
            ><strong>{t.name}</strong>{#if t.app_id}
              <span class="badge badge-ghost badge-sm">app</span>{/if}<br
            /><span class="text-xs opacity-60"
              >{t.scopes.join(", ")} - {t.last_used_at
                ? `used ${formatDateTime(t.last_used_at)}`
                : "never used"}</span
            ></span
          >
          {#if !t.app_id}<form method="POST" action="?/revoke" use:enhance>
              <input type="hidden" name="id" value={t.id} /><button
                class="btn btn-ghost btn-xs text-error">Revoke</button
              >
            </form>{/if}
        </div>
      {:else}<p class="text-sm opacity-60">No tokens.</p>{/each}
    </div>
  </section>

  <section class="card bg-base-100 border border-base-300">
    <div class="card-body gap-3">
      <h2 class="card-title text-base">Webhooks</h2>
      <p class="text-sm opacity-70">
        A signed POST to your address when something happens. Check the <code
          >x-base-suite-signature</code
        >
        header: <code>t=time,v1=HMAC-SHA256(secret, "time.body")</code>. Failed
        deliveries are retried for about 15 hours.
      </p>
      <form
        method="POST"
        action="?/webhook"
        use:enhance={keep}
        class="space-y-2 rounded-box border border-base-200 p-3"
      >
        <input
          name="url"
          class="input input-sm w-full font-mono"
          placeholder="https://example.com/hooks/site"
          maxlength="1000"
          required
        />
        <div class="grid gap-1 sm:grid-cols-2">
          {#each data.events as e (e)}<label
              class="flex items-center gap-2 text-sm"
              ><input
                type="checkbox"
                name="events"
                value={e}
                class="checkbox checkbox-xs"
              /><code>{e}</code></label
            >{/each}
        </div>
        <button class="btn btn-primary btn-sm">Add webhook</button>
      </form>
      {#each data.hooks as h (h.id)}
        <div
          class="flex flex-wrap items-center justify-between gap-2 border-b border-base-200 pb-2 text-sm"
        >
          <span class="min-w-0"
            ><span class="font-mono break-all">{h.url}</span>{#if h.app_id}
              <span class="badge badge-ghost badge-sm">app</span>{/if}<br
            /><span class="text-xs opacity-60">{h.events.join(", ")}</span
            ></span
          >
          <span class="flex gap-1">
            <form method="POST" action="?/toggle" use:enhance>
              <input type="hidden" name="id" value={h.id} /><input
                type="hidden"
                name="active"
                value={h.active ? "0" : "1"}
              /><button class="btn btn-xs"
                >{h.active ? "Pause" : "Resume"}</button
              >
            </form>
            <form method="POST" action="?/deleteWebhook" use:enhance>
              <input type="hidden" name="id" value={h.id} /><button
                class="btn btn-ghost btn-xs text-error">Remove</button
              >
            </form>
          </span>
        </div>
      {:else}<p class="text-sm opacity-60">No webhooks.</p>{/each}
      {#if data.hooks.length}<form method="POST" action="?/test" use:enhance>
          <button class="btn btn-xs w-fit">Send a test event</button>
        </form>{/if}
    </div>
  </section>
</div>

{#if data.deliveries.length}
  <h2 class="font-semibold mt-8 mb-2">Recent deliveries</h2>
  <div class="overflow-x-auto rounded-box border border-base-300 bg-base-100">
    <table class="table table-sm">
      <thead
        ><tr
          ><th>When</th><th>Event</th><th>Address</th><th>Result</th><th
          ></th></tr
        ></thead
      >
      <tbody>
        {#each data.deliveries as d (d.id)}
          <tr>
            <td class="text-xs">{formatDateTime(d.created_at)}</td>
            <td><code class="text-xs">{d.event}</code></td>
            <td class="font-mono text-xs break-all">{d.url}</td>
            <td class="text-xs"
              ><span
                class="badge badge-sm {d.status === 'delivered'
                  ? 'badge-success'
                  : d.status === 'failed'
                    ? 'badge-error'
                    : 'badge-warning'}">{d.status}</span
              >
              {d.response_code ?? ""}
              {d.error ?? ""}
              {d.attempts > 1 ? `(${d.attempts} tries)` : ""}</td
            >
            <td
              >{#if d.status !== "delivered"}<form
                  method="POST"
                  action="?/redeliver"
                  use:enhance
                >
                  <input type="hidden" name="id" value={d.id} /><button
                    class="btn btn-ghost btn-xs">Retry</button
                  >
                </form>{/if}</td
            >
          </tr>
        {/each}
      </tbody>
    </table>
  </div>
{/if}
