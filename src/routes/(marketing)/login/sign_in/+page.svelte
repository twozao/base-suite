<script lang="ts">
  import { enhance } from "$app/forms"
  import { page } from "$app/stores"

  let { form } = $props()
  let loading = $state(false)
</script>

<svelte:head>
  <title>Sign in</title>
</svelte:head>

{#if $page.url.searchParams.get("verified") === "true"}
  <div role="alert" class="alert alert-success mb-5">
    <span>Email verified. Please sign in.</span>
  </div>
{/if}
{#if $page.url.searchParams.get("reset") === "true"}
  <div role="alert" class="alert alert-success mb-5">
    <span>Password changed. Please sign in.</span>
  </div>
{/if}
<h1 class="text-2xl font-bold mb-6">Sign in</h1>
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
      autocomplete="current-password"
      required
      class="input input-bordered w-full"
    />
  </label>
  {#if form?.error}
    <p class="text-error text-sm">{form.error}</p>
  {/if}
  <button class="btn btn-primary mt-2" disabled={loading}>
    {loading ? "Signing in..." : "Sign in"}
  </button>
</form>
<div class="text-l text-slate-800 mt-4">
  <a class="underline" href="/login/forgot_password">Forgot password?</a>
</div>
<div class="text-l text-slate-800 mt-3">
  Don't have an account? <a class="underline" href="/login/sign_up">Sign up</a>.
</div>
