<script lang="ts">
  import { enhance } from "$app/forms"
  import PageHeader from "$lib/components/admin/PageHeader.svelte"

  let { data, form } = $props()
  let saving = $state(false)
</script>

<svelte:head><title>Sign-in</title></svelte:head>

<PageHeader
  title="Sign-in"
  subtitle="Whether visitors can have accounts, and how they sign in."
/>

<form
  method="POST"
  autocomplete="off"
  class="space-y-6 max-w-3xl"
  use:enhance={() => {
    saving = true
    return async ({ update }) => {
      await update({ reset: false })
      saving = false
    }
  }}
>
  <section class="card bg-base-100 border border-base-300">
    <div class="card-body gap-4">
      <h2 class="card-title">Access</h2>
      <label class="flex items-start gap-3">
        <input
          type="checkbox"
          class="checkbox checkbox-sm mt-1"
          name="enabled"
          checked={data.enabled}
        />
        <span>
          <span class="block font-medium">Let visitors sign in</span>
          <span class="block text-sm text-base-content/70">
            Off hides the Sign in links and closes the customer portal. Staff
            can always sign in at
            <code>/login/sign_in</code>.
          </span>
        </span>
      </label>
      <label class="flex items-start gap-3">
        <input
          type="checkbox"
          class="checkbox checkbox-sm mt-1"
          name="allowSignUp"
          checked={data.allowSignUp}
        />
        <span>
          <span class="block font-medium">Allow new accounts</span>
          <span class="block text-sm text-base-content/70">
            Off means only existing accounts can sign in, by any method.
          </span>
        </span>
      </label>
    </div>
  </section>

  <section class="card bg-base-100 border border-base-300">
    <div class="card-body gap-4">
      <h2 class="card-title">Email and password</h2>
      <label class="flex items-start gap-3">
        <input
          type="checkbox"
          class="checkbox checkbox-sm mt-1"
          name="password"
          checked={data.password}
        />
        <span>
          <span class="block font-medium">Allow email and password sign-in</span
          >
          <span class="block text-sm text-base-content/70">
            Can only be turned off once a provider below is on and your own
            account is connected to it.
            {#if !data.mailConfigured}
              No mail provider is set up, so sign-ups skip email verification
              and password reset is unavailable.
            {/if}
          </span>
        </span>
      </label>
    </div>
  </section>

  {#each data.providers as p (p.id)}
    <section class="card bg-base-100 border border-base-300" id={p.id}>
      <div class="card-body gap-4">
        <h2 class="card-title">{p.label}</h2>
        <label class="flex items-center gap-3">
          <input
            type="checkbox"
            class="checkbox checkbox-sm"
            name="{p.id}_enabled"
            checked={p.enabled}
          />
          <span class="font-medium">Offer "Continue with {p.label}"</span>
        </label>

        <details class="rounded-box border border-base-300 p-3 text-sm">
          <summary class="cursor-pointer font-medium"
            >How to get these keys</summary
          >
          <ol class="mt-3 list-decimal space-y-1 pl-5 text-base-content/80">
            <li>
              Go to the
              <a
                class="link"
                href={p.consoleUrl}
                target="_blank"
                rel="noopener noreferrer">{p.consoleName}</a
              >.
            </li>
            {#each p.steps as step}<li>{step}</li>{/each}
          </ol>
        </details>

        <label class="block">
          <span class="mb-1 block text-sm font-medium"
            >Callback URL (copy this to {p.label})</span
          >
          <input
            class="input w-full font-mono text-sm"
            readonly
            value={p.callbackUrl}
          />
          <span class="mt-1 block text-xs text-base-content/60">
            Must match exactly, so register your live domain as well when you
            deploy.
          </span>
        </label>

        {#if p.fromEnv}
          <p class="text-sm text-base-content/70">
            Keys come from the environment variables PRIVATE_{p.id.toUpperCase()}_CLIENT_ID
            and PRIVATE_{p.id.toUpperCase()}_CLIENT_SECRET, which override
            anything saved here.
          </p>
          <input type="hidden" name="{p.id}_clientId" value={p.clientId} />
        {:else}
          <label class="block">
            <span class="mb-1 block text-sm font-medium">Client ID</span>
            <input
              class="input w-full font-mono text-sm"
              name="{p.id}_clientId"
              value={p.clientId}
              maxlength="300"
              autocomplete="off"
            />
          </label>
          <label class="block">
            <span class="mb-1 block text-sm font-medium">Client secret</span>
            <input
              class="input w-full font-mono text-sm"
              type="password"
              name="{p.id}_secret"
              maxlength="500"
              autocomplete="new-password"
              placeholder={p.hasSecret ? "Saved. Leave empty to keep it." : ""}
            />
            <span class="mt-1 block text-xs text-base-content/60">
              Stored encrypted and never shown again.
            </span>
          </label>
          {#if p.hasSecret}
            <label class="flex items-center gap-3 text-sm">
              <input
                type="checkbox"
                class="checkbox checkbox-sm"
                name="{p.id}_remove_secret"
              />
              Remove the saved secret
            </label>
          {/if}
        {/if}

        {#if p.enabled}
          <p class="text-sm text-base-content/70">
            {#if p.linked}
              Your account is connected to {p.label}.
            {:else}
              Your account is not connected yet. To test the keys,
              <a class="link" href="/account/settings"
                >connect it in Account -> Settings</a
              >.
            {/if}
          </p>
        {/if}
      </div>
    </section>
  {/each}

  <div class="flex flex-wrap items-center gap-4">
    <button class="btn btn-primary btn-sm" disabled={saving}
      >Save sign-in settings</button
    >
    {#if form?.error}<span class="text-error text-sm" role="alert"
        >{form.error}</span
      >
    {:else if form?.message}<span class="text-success text-sm" role="status"
        >{form.message}</span
      >{/if}
  </div>
</form>
