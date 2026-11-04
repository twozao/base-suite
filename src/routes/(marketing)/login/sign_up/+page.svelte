<script lang="ts">
  import { enhance } from "$app/forms"

  let { form } = $props()
  let loading = $state(false)
</script>

<svelte:head>
  <title>Sign up</title>
</svelte:head>

<h1 class="text-2xl font-bold mb-6">Sign up</h1>
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
  {#if form?.error}
    <p class="text-error text-sm">{form.error}</p>
  {/if}
  <button class="btn btn-primary mt-2" disabled={loading}>
    {loading ? "Creating account..." : "Create account"}
  </button>
</form>
<div class="text-l text-slate-800 mt-4 mb-2">
  Have an account? <a class="underline" href="/login/sign_in">Sign in</a>.
</div>
