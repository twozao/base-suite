<script lang="ts">
  import { enhance } from "$app/forms"
  import { page } from "$app/stores"
  import OAuthButtons from "$lib/components/site/OAuthButtons.svelte"

  let { data, form } = $props()
  let loading = $state(false)
</script>

<svelte:head>
  <title>Sign up</title>
</svelte:head>

<h1 class="text-2xl font-bold mb-6">Sign up</h1>
{#if !data.signin.canSignUp}
  <p class="text-base-content/80">New accounts are not open at the moment.</p>
{:else}
  <OAuthButtons
    providers={data.signin.providers}
    next={$page.url.searchParams.get("next")}
  />
  {#if data.signin.providers.length && data.signin.password}
    <div class="divider text-sm text-base-content/60">or</div>
  {/if}
  {#if data.signin.password}
    <form
      method="POST"
      class="flex flex-col gap-3 text-left"
      use:enhance={() => {
        loading = true
        return async ({ update }) => {
          await update({ reset: false })
          loading = false
        }
      }}
    >
      <label class="form-control">
        <span class="label-text">Email</span>
        <input
          name="email"
          type="email"
          autocomplete="email"
          required
          class="input input-bordered w-full"
          value={form?.email ?? ""}
        />
      </label>
      <label class="form-control">
        <span class="label-text">Password</span>
        <input
          name="password"
          type="password"
          autocomplete="new-password"
          required
          minlength="8"
          class="input input-bordered w-full"
        />
      </label>
      {#if data.signin.setupCode}
        <label class="form-control">
          <span class="label-text">Setup code</span>
          <span class="label-text-alt text-base-content/70"
            >This site has no admin yet. Enter the PRIVATE_SETUP_CODE you set
            when deploying.</span
          >
          <input
            name="setupCode"
            type="password"
            autocomplete="off"
            required
            class="input input-bordered w-full"
          />
        </label>
      {/if}
      {#if form?.error}
        <p class="text-error text-sm">{form.error}</p>
      {/if}
      <button class="btn btn-primary mt-2" disabled={loading}>
        {loading ? "Creating account..." : "Create account"}
      </button>
    </form>
  {/if}
{/if}
<div class="text-base-content/80 mt-4 mb-2">
  Have an account? <a class="underline" href="/login/sign_in{$page.url.search}"
    >Sign in</a
  >.
</div>
